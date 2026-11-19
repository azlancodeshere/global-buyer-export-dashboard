import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import cors from 'cors';
import multer from 'multer';

import * as store from './store';
import { discoverBuyers } from './services/discovery';
import { validateEmail } from './services/validation';
import { classifyLeads } from './services/classifier';
import { sendOutreach, getMode } from './services/mailer';
import type { Lead } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 5000;
// Vercel function filesystems are read-only outside /tmp.
const UPLOAD_DIR = process.env.VERCEL ? '/tmp/gbed-uploads' : path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use('/uploads', express.static(UPLOAD_DIR));
// express.static() is ignored on Vercel, so uploaded files are served explicitly.
app.get('/uploads/:name', (req: Request, res: Response) => {
  const file = path.join(UPLOAD_DIR, path.basename(String(req.params.name)));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'File not found.' });
  res.sendFile(file);
});

const memoryUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const presentationUpload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.pdf';
      cb(null, `presentation-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

function countBy(items: Lead[], key: string): Record<string, number> {
  return items.reduce((acc: Record<string, number>, item) => {
    const k = String(item[key] || 'Unknown');
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

function toArray(counts: Record<string, number>, limit = 8) {
  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Health & configuration
// ---------------------------------------------------------------------------
app.get('/api/health', (_req: Request, res: Response) => res.json({ ok: true, time: new Date().toISOString() }));

app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    gemini: Boolean(process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
    discovery: Boolean(process.env.SERPER_API_KEY || process.env.GOOGLE_CSE_KEY) ? 'api' : 'keyless',
    mail: getMode(),
  });
});

// ---------------------------------------------------------------------------
// Stats / reporting
// ---------------------------------------------------------------------------
app.get('/api/stats', async (_req: Request, res: Response) => {
  const leads = store.read('leads');
  const emails = store.read('emails');
  const activity = store.read('activity');
  const duplicatesBlocked = activity.reduce((n, a) => n + Number(a.meta?.duplicates || 0), 0);

  res.json({
    totalLeads: leads.length,
    validEmails: leads.filter((l) => l.emailStatus === 'valid').length,
    invalidEmails: leads.filter((l) => l.emailStatus === 'invalid').length,
    suspectEmails: leads.filter((l) => l.emailStatus === 'suspect').length,
    uncheckedEmails: leads.filter((l) => l.emailStatus === 'unchecked').length,
    businessBuyers: leads.filter((l) => l.classification === 'business').length,
    individualBuyers: leads.filter((l) => l.classification === 'individual').length,
    unclassified: leads.filter((l) => !l.classification || l.classification === 'unclassified').length,
    emailsSent: emails.filter((e) => e.status === 'sent').length,
    demoSent: emails.filter((e) => e.status === 'demo-sent').length,
    duplicatesBlocked,
    bySource: toArray(countBy(leads, 'source')),
    byCity: toArray(countBy(leads, 'city')),
    byProduct: toArray(countBy(leads, 'product')),
    classification: [
      { name: 'Business', value: leads.filter((l) => l.classification === 'business').length },
      { name: 'Individual', value: leads.filter((l) => l.classification === 'individual').length },
      { name: 'Unclassified', value: leads.filter((l) => !l.classification || l.classification === 'unclassified').length },
    ].filter((x) => x.value > 0),
    emailHealth: [
      { name: 'Valid', value: leads.filter((l) => l.emailStatus === 'valid').length },
      { name: 'Suspect', value: leads.filter((l) => l.emailStatus === 'suspect').length },
      { name: 'Invalid', value: leads.filter((l) => l.emailStatus === 'invalid').length },
      { name: 'Unchecked', value: leads.filter((l) => l.emailStatus === 'unchecked').length },
    ].filter((x) => x.value > 0),
    outreachFunnel: [
      { name: 'Discovered', value: leads.length },
      { name: 'Valid email', value: leads.filter((l) => l.emailStatus === 'valid').length },
      { name: 'Classified B2B', value: leads.filter((l) => l.classification === 'business').length },
      { name: 'Contacted', value: leads.filter((l) => l.emailed).length },
    ],
    recentLeads: leads.slice(-6).reverse(),
    recentActivity: activity.slice(0, 8),
  });
});

app.get('/api/activity', (_req: Request, res: Response) => res.json(store.read('activity')));

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
app.get('/api/leads', (req: Request, res: Response) => {
  let leads = store.read('leads');
  const { q, source, classification, emailStatus, emailed } = req.query;
  if (q) {
    const needle = String(q).toLowerCase();
    leads = leads.filter((l) =>
      [l.name, l.company, l.email, l.phone, l.city, l.state, l.product]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }
  if (source && source !== 'all') leads = leads.filter((l) => l.source === source);
  if (classification && classification !== 'all') {
    leads = leads.filter((l) =>
      classification === 'unclassified'
        ? !l.classification || l.classification === 'unclassified'
        : l.classification === classification
    );
  }
  if (emailStatus && emailStatus !== 'all') leads = leads.filter((l) => l.emailStatus === emailStatus);
  if (emailed === 'true') leads = leads.filter((l) => l.emailed);
  if (emailed === 'false') leads = leads.filter((l) => !l.emailed);
  res.json(leads);
});

app.post('/api/leads', async (req: Request, res: Response) => {
  const body = (req.body || {}) as Record<string, string>;
  if (!body.name || !body.company) {
    return res.status(400).json({ error: 'Name and company are required.' });
  }
  const lead: Lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: body.name,
    company: body.company,
    email: body.email || '',
    phone: body.phone || '',
    website: body.website || '',
    source: body.source || 'Manual Entry',
    product: body.product || 'Singing Bowls',
    city: body.city || '',
    state: body.state || '',
    country: body.country || 'United States',
    classification: 'unclassified',
    classificationConfidence: null,
    classificationReason: '',
    emailStatus: body.email ? 'unchecked' : 'invalid',
    emailCheckedAt: null,
    emailed: false,
    dateAdded: new Date().toISOString(),
  };
  const result = await store.update('leads', (leads) => {
    if (store.isDuplicate(leads, lead)) return { duplicate: true };
    leads.push(lead);
    return { duplicate: false };
  });
  if (result.duplicate) return res.status(409).json({ error: 'This buyer already exists (duplicate email or website).' });
  await store.logActivity('lead', `Added buyer ${lead.company}`, { source: lead.source });
  res.status(201).json(lead);
});

app.patch('/api/leads/:id', async (req: Request, res: Response) => {
  const updated = await store.update('leads', (leads) => {
    const i = leads.findIndex((l) => l.id === req.params.id);
    if (i === -1) return null;
    leads[i] = { ...leads[i], ...(req.body as Partial<Lead>), id: leads[i].id };
    return leads[i];
  });
  if (!updated) return res.status(404).json({ error: 'Lead not found.' });
  res.json(updated);
});

app.delete('/api/leads/:id', async (req: Request, res: Response) => {
  const removed = await store.update('leads', (leads) => {
    const i = leads.findIndex((l) => l.id === req.params.id);
    if (i === -1) return null;
    return leads.splice(i, 1)[0];
  });
  if (!removed) return res.status(404).json({ error: 'Lead not found.' });
  await store.logActivity('lead', `Removed buyer ${removed.company}`);
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Buyer discovery
// ---------------------------------------------------------------------------
app.post('/api/discovery/search', async (req: Request, res: Response) => {
  const body = (req.body || {}) as {
    product?: string;
    location?: string;
    sources?: string[];
    limit?: number;
  };
  const product = body.product || 'Singing Bowls';
  const location = body.location || 'Houston, TX, United States';
  const sources = body.sources || [];
  const limit = Number(body.limit) || 8;
  try {
    const result = await discoverBuyers({ product, location, sources, limit });
    const added = await store.update('leads', (leads) => {
      const fresh: Lead[] = [];
      let duplicates = 0;
      for (const lead of result.leads) {
        if (store.isDuplicate(leads.concat(fresh), lead)) duplicates += 1;
        else fresh.push(lead);
      }
      leads.push(...fresh);
      return { fresh, duplicates };
    });
    await store.logActivity(
      'discovery',
      `Discovered ${added.fresh.length} buyers for "${product}" in ${location}`,
      { engine: result.meta.engine, found: result.leads.length, duplicates: added.duplicates }
    );
    res.json({ ...result.meta, added: added.fresh.length, duplicates: added.duplicates, leads: added.fresh });
  } catch (err) {
    res.status(500).json({ error: String((err as Error).message || err) });
  }
});

// ---------------------------------------------------------------------------
// CSV upload
// ---------------------------------------------------------------------------
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(cur);
      cur = '';
    } else if (c === '\n') {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else if (c !== '\r') cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

app.post('/api/leads/upload', memoryUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const rows = parseCSV(req.file.buffer.toString('utf8'));
  if (rows.length < 2) return res.status(400).json({ error: 'CSV has no data rows.' });
  const headers = rows[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
  const get = (row: string[], keys: string[]): string => {
    for (const key of keys) {
      const idx = headers.indexOf(key);
      if (idx !== -1) return (row[idx] || '').trim();
    }
    return '';
  };
  const result = await store.update('leads', (leads) => {
    const fresh: Lead[] = [];
    let duplicates = 0;
    for (const row of rows.slice(1)) {
      if (!row.some((cell) => String(cell).trim())) continue;
      const lead: Lead = {
        id: `lead_${Date.now()}_${fresh.length}_${Math.random().toString(36).slice(2, 6)}`,
        name: get(row, ['name', 'contactname', 'fullname', 'buyername']) || 'Unknown Buyer',
        company: get(row, ['company', 'companyname', 'business', 'showroom']) || 'Unknown Company',
        email: get(row, ['email', 'emailid', 'contactemail']),
        phone: get(row, ['phone', 'phonenumber', 'contactnumber', 'mobile']),
        website: get(row, ['website', 'site', 'url']),
        source: get(row, ['source', 'platform']) || 'CSV Upload',
        product: get(row, ['product', 'item']) || 'Singing Bowls',
        city: get(row, ['city']),
        state: get(row, ['state']),
        country: get(row, ['country']) || 'United States',
        classification: 'unclassified',
        classificationConfidence: null,
        classificationReason: '',
        emailStatus: 'unchecked',
        emailCheckedAt: null,
        emailed: false,
        dateAdded: new Date().toISOString(),
      };
      if (store.isDuplicate(leads.concat(fresh), lead)) duplicates += 1;
      else fresh.push(lead);
    }
    leads.push(...fresh);
    return { fresh, duplicates };
  });
  await store.logActivity('upload', `Imported ${result.fresh.length} buyers from CSV`, {
    duplicates: result.duplicates,
  });
  res.json({ added: result.fresh.length, duplicates: result.duplicates });
});

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------
app.post('/api/validation/run', async (req: Request, res: Response) => {
  const body = (req.body || {}) as { ids?: string[] };
  const ids = Array.isArray(body.ids) && body.ids.length ? new Set(body.ids) : null;
  const leads = store.read('leads').filter((l) => (!ids || ids.has(l.id)) && l.email);
  const results: Array<{ id: string; status: string; reason: string }> = [];
  for (const lead of leads) {
    const result = await validateEmail(lead.email);
    results.push({ id: lead.id, ...result });
  }
  const byId = new Map(results.map((r) => [r.id, r]));
  await store.update('leads', (all) => {
    for (const lead of all) {
      const r = byId.get(lead.id);
      if (!r) continue;
      lead.emailStatus = r.status as Lead['emailStatus'];
      lead.emailCheckedAt = new Date().toISOString();
    }
  });
  await store.logActivity('validation', `Validated ${results.length} email addresses`, {
    valid: results.filter((r) => r.status === 'valid').length,
    invalid: results.filter((r) => r.status === 'invalid').length,
  });
  res.json({
    checked: results.length,
    valid: results.filter((r) => r.status === 'valid').length,
    invalid: results.filter((r) => r.status === 'invalid').length,
    suspect: results.filter((r) => r.status === 'suspect').length,
    results,
  });
});

// ---------------------------------------------------------------------------
// Gemini AI classification
// ---------------------------------------------------------------------------
app.post('/api/classify/run', async (req: Request, res: Response) => {
  const body = (req.body || {}) as { ids?: string[] };
  const ids = Array.isArray(body.ids) && body.ids.length ? new Set(body.ids) : null;
  const leads = store.read('leads').filter((l) => !ids || ids.has(l.id));
  if (!leads.length) return res.json({ engine: 'none', classified: 0 });
  const { engine, results } = await classifyLeads(leads);
  const byId = new Map(results.map((r) => [r.id, r]));
  await store.update('leads', (all) => {
    for (const lead of all) {
      const r = byId.get(lead.id);
      if (!r) continue;
      lead.classification = r.classification;
      lead.classificationConfidence = r.confidence;
      lead.classificationReason = r.reason;
    }
  });
  await store.logActivity('classification', `Classified ${results.length} buyers with ${engine}`, {
    business: results.filter((r) => r.classification === 'business').length,
    individual: results.filter((r) => r.classification === 'individual').length,
  });
  res.json({
    engine,
    classified: results.length,
    business: results.filter((r) => r.classification === 'business').length,
    individual: results.filter((r) => r.classification === 'individual').length,
  });
});

// ---------------------------------------------------------------------------
// Presentation PDF
// ---------------------------------------------------------------------------
app.get('/api/presentation', (_req: Request, res: Response) => res.json(store.read('presentation')[0] || null));

app.post('/api/presentation', presentationUpload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
  const meta = {
    filename: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    contentType: req.file.mimetype,
    url: `/uploads/${req.file.filename}`,
    uploadedAt: new Date().toISOString(),
  };
  await store.update('presentation', (items) => {
    items.length = 0;
    items.push(meta);
  });
  await store.logActivity('presentation', `Uploaded presentation ${meta.filename}`);
  res.json(meta);
});

app.delete('/api/presentation', async (_req: Request, res: Response) => {
  const items = store.read('presentation');
  if (items[0]) {
    const file = path.join(UPLOAD_DIR, items[0].storedName);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  await store.update('presentation', (list) => {
    list.length = 0;
  });
  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// Outreach / Gmail sender
// ---------------------------------------------------------------------------
app.get('/api/outreach/history', (_req: Request, res: Response) => res.json(store.read('emails')));

app.post('/api/outreach/send', async (req: Request, res: Response) => {
  const body = (req.body || {}) as {
    ids?: string[];
    subject?: string;
    body?: string;
    includeAttachment?: boolean;
  };
  const ids = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) return res.status(400).json({ error: 'Select at least one buyer.' });
  if (!body.subject || !body.body) return res.status(400).json({ error: 'Subject and message are required.' });

  const leads = store.read('leads').filter((l) => ids.includes(l.id));
  const meta = store.read('presentation')[0] || null;
  let attachment: { filename: string; contentType: string; content: string } | null = null;
  if (body.includeAttachment && meta) {
    const file = path.join(UPLOAD_DIR, meta.storedName);
    if (fs.existsSync(file)) {
      attachment = {
        filename: meta.filename,
        contentType: meta.contentType,
        content: fs.readFileSync(file).toString('base64'),
      };
    }
  }

  const { mode, results } = await sendOutreach(leads, {
    subject: body.subject,
    body: body.body,
    attachment,
  });
  const sentIds = results.filter((r) => r.status === 'sent' || r.status === 'demo-sent').map((r) => r.leadId);
  const records = results.map((r) => ({
    id: `email_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    leadId: r.leadId,
    email: r.email,
    name: leads.find((l) => l.id === r.leadId)?.name || '',
    company: leads.find((l) => l.id === r.leadId)?.company || '',
    subject: body.subject as string,
    status: r.status,
    detail: r.detail,
    attachment: body.includeAttachment && meta ? meta.filename : '',
    mode,
    sentAt: new Date().toISOString(),
  }));

  await store.update('emails', (emails) => emails.unshift(...records));
  if (sentIds.length) {
    await store.update('leads', (all) => {
      for (const lead of all) if (sentIds.includes(lead.id)) lead.emailed = true;
    });
  }
  await store.logActivity('email', `Outreach sent to ${sentIds.length} buyers (${mode})`, {
    sent: sentIds.length,
    mode,
  });
  res.json({ mode, results });
});

// ---------------------------------------------------------------------------
// Serve built frontend in production
// ---------------------------------------------------------------------------
const dist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(dist, 'index.html')));
}

app.use((err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// On Vercel the app is exported as a serverless function instead of listening.
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n  Global Buyer Export Dashboard API running at http://localhost:${PORT}`);
    console.log(`  Config: ${JSON.stringify({
      gemini: Boolean(process.env.GEMINI_API_KEY),
      mail: getMode(),
      discovery: process.env.SERPER_API_KEY || process.env.GOOGLE_CSE_KEY ? 'api' : 'keyless',
    })}\n`);
  });
}

export default app;
