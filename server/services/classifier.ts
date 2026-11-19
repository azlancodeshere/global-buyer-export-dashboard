import { FREE_PROVIDERS } from './validation.js';
import type { Classification, Lead } from '../types.js';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

interface ClassificationResult {
  id: string;
  classification: Classification;
  confidence: number;
  reason: string;
}

function heuristic(lead: Lead): ClassificationResult {
  const domain = String(lead.email || '').split('@')[1]?.toLowerCase() || '';
  const free = FREE_PROVIDERS.has(domain);
  const text = `${lead.company || ''} ${lead.name || ''} ${lead.website || ''}`.toLowerCase();
  const businessSignals = [
    'import', 'wholesale', 'distributor', 'distribution', 'showroom', 'store', 'retail',
    'supply', 'supplies', 'group', 'mart', 'hub', 'collective', 'trading', 'company',
    'inc', 'llc', 'ltd', 'co', 'furnishings', 'decor', 'home', 'wellness',
  ];
  const individualSignals = ['practitioner', 'individual', 'personal', 'hobbyist', 'freelancer'];
  const score =
    businessSignals.reduce((n, s) => n + (text.includes(s) ? 1 : 0), 0) -
    (free ? 2 : 0) -
    individualSignals.reduce((n, s) => n + (text.includes(s) ? 1 : 0), 0);
  const classification: Classification = score >= 0 ? 'business' : 'individual';
  return {
    id: lead.id,
    classification,
    confidence: classification === 'business' ? Math.min(0.95, 0.7 + score * 0.03) : 0.82,
    reason: free
      ? 'Free email provider suggests an individual buyer.'
      : 'Domain and company name signals suggest a business buyer.',
  };
}

function extractJson(text = ''): Array<Record<string, unknown>> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Array<Record<string, unknown>>;
  } catch {
    return null;
  }
}

async function callGemini(leads: Lead[]): Promise<ClassificationResult[] | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const payload = leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    email: l.email,
    website: l.website,
    source: l.source,
    product: l.product,
    city: l.city,
  }));

  const prompt = `You are a B2B export data analyst for a company exporting singing bowls and home decor from India to the USA.
Classify each buyer contact as exactly one of:
- "business": an importer, wholesaler, retailer, distributor, showroom, shop, store, wellness center, or company that buys products for resale.
- "individual": a private person, hobbyist, or individual practitioner using a personal email address.

Return ONLY a JSON array, no markdown, no explanation. Each element must be:
{"id":"<same id>","classification":"business|individual","confidence":0-1,"reason":"short reason"}

Buyers:
${JSON.stringify(payload)}`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      MODEL
    )}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = extractJson(text);
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((p) => p && p.id)
      .map((p): ClassificationResult => ({
        id: String(p.id),
        classification: p.classification === 'individual' ? 'individual' : 'business',
        confidence: Number.isFinite(Number(p.confidence)) ? Number(p.confidence) : 0.8,
        reason: String(p.reason || 'AI classification').slice(0, 180),
      }));
  } catch {
    return null;
  }
}

export async function classifyLeads(
  leads: Lead[]
): Promise<{ engine: string; results: ClassificationResult[] }> {
  if (!leads.length) return { engine: 'none', results: [] };
  const ai = await callGemini(leads);
  if (ai) {
    const byId = new Map(ai.map((r) => [r.id, r]));
    return {
      engine: `Gemini (${MODEL})`,
      results: leads.map((lead) => byId.get(lead.id) || heuristic(lead)),
    };
  }
  return {
    engine: process.env.GEMINI_API_KEY ? 'Heuristic fallback (Gemini unavailable)' : 'Heuristic fallback (no API key)',
    results: leads.map(heuristic),
  };
}
