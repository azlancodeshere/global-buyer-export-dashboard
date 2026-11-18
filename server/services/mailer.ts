import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import type { Lead } from '../types';

const FROM_NAME = process.env.FROM_NAME || 'Global Exports Team';
export type MailMode = 'gmail-api' | 'smtp' | 'demo';

interface Attachment {
  filename: string;
  contentType: string;
  content: string; // base64
}

export function getMode(): MailMode {
  if (
    process.env.GMAIL_CLIENT_ID &&
    process.env.GMAIL_CLIENT_SECRET &&
    process.env.GMAIL_REFRESH_TOKEN
  ) {
    return 'gmail-api';
  }
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return 'smtp';
  return 'demo';
}

function personalize(template: string, lead: Lead): string {
  return String(template || '')
    .replace(/\{\{\s*name\s*\}\}/gi, lead.name || 'there')
    .replace(/\{\{\s*company\s*\}\}/gi, lead.company || 'your company')
    .replace(/\{\{\s*product\s*\}\}/gi, lead.product || 'our products')
    .replace(/\{\{\s*city\s*\}\}/gi, lead.city || 'your city')
    .replace(/\{\{\s*sender_name\s*\}\}/gi, FROM_NAME);
}

async function buildMime(opts: {
  to: string;
  from: string;
  subject: string;
  text: string;
  attachment: Attachment | null;
}): Promise<Buffer> {
  const transporter = nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix',
  });
  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${opts.from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: opts.attachment
      ? [
          {
            filename: opts.attachment.filename,
            content: Buffer.from(opts.attachment.content, 'base64'),
            contentType: opts.attachment.contentType || 'application/pdf',
          },
        ]
      : [],
  });
  return info.message as Buffer;
}

async function sendViaGmailApi(opts: {
  to: string;
  from: string;
  subject: string;
  text: string;
  attachment: Attachment | null;
}): Promise<string> {
  const mime = await buildMime(opts);
  const auth = new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:5001/api/outreach/oauth/callback'
  );
  auth.setCredentials({ refresh_token: process.env.GMAIL_REFRESH_TOKEN });
  const gmail = google.gmail({ version: 'v1', auth });
  const raw = mime
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const res = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return String(res.data.id || 'sent');
}

async function sendViaSmtp(opts: {
  to: string;
  from: string;
  subject: string;
  text: string;
  attachment: Attachment | null;
}): Promise<string> {
  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${opts.from}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: opts.attachment
      ? [
          {
            filename: opts.attachment.filename,
            content: Buffer.from(opts.attachment.content, 'base64'),
            contentType: opts.attachment.contentType || 'application/pdf',
          },
        ]
      : [],
  });
  return String(info.messageId || 'sent');
}

export interface SendResult {
  leadId: string;
  email: string;
  status: 'sent' | 'demo-sent' | 'failed' | 'skipped';
  detail: string;
}

export async function sendOutreach(
  leads: Lead[],
  opts: { subject: string; body: string; attachment: Attachment | null }
): Promise<{ mode: MailMode; results: SendResult[] }> {
  const mode = getMode();
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER || 'exports@example.com';
  const results: SendResult[] = [];

  for (const lead of leads) {
    const email = String(lead.email || '').trim();
    if (!email) {
      results.push({ leadId: lead.id, email: '', status: 'skipped', detail: 'No email address' });
      continue;
    }
    const finalSubject = personalize(opts.subject, lead);
    const finalText = personalize(opts.body, lead);
    try {
      let detail = '';
      if (mode === 'gmail-api') {
        detail = await sendViaGmailApi({ to: email, from, subject: finalSubject, text: finalText, attachment: opts.attachment });
      } else if (mode === 'smtp') {
        detail = await sendViaSmtp({ to: email, from, subject: finalSubject, text: finalText, attachment: opts.attachment });
      } else {
        detail = 'DEMO: logged, not actually sent';
      }
      results.push({
        leadId: lead.id,
        email,
        status: mode === 'demo' ? 'demo-sent' : 'sent',
        detail,
      });
    } catch (err) {
      results.push({
        leadId: lead.id,
        email,
        status: 'failed',
        detail: String((err as Error).message || err).slice(0, 200),
      });
    }
  }

  return { mode, results };
}
