import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedLeads } from './data/seed';
import type { Activity, EmailRecord, Lead, PresentationMeta, StoreKey } from './types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Vercel function filesystems are read-only outside /tmp, so data lives there in production.
const DATA_DIR = process.env.VERCEL ? '/tmp/gbed-data' : path.join(__dirname, 'data');

type StoreMap = {
  leads: Lead[];
  emails: EmailRecord[];
  activity: Activity[];
  presentation: PresentationMeta[];
};

const FILES: Record<StoreKey, string> = {
  leads: path.join(DATA_DIR, 'leads.json'),
  emails: path.join(DATA_DIR, 'emails.json'),
  activity: path.join(DATA_DIR, 'activity.json'),
  presentation: path.join(DATA_DIR, 'presentation.json'),
};

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(FILES.leads)) {
  fs.writeFileSync(FILES.leads, JSON.stringify(seedLeads, null, 2));
}
for (const key of ['emails', 'activity', 'presentation'] as StoreKey[]) {
  if (!fs.existsSync(FILES[key])) fs.writeFileSync(FILES[key], '[]');
}

export function read<K extends StoreKey>(key: K): StoreMap[K] {
  try {
    return JSON.parse(fs.readFileSync(FILES[key], 'utf8')) as StoreMap[K];
  } catch {
    return [] as StoreMap[K];
  }
}

export function write<K extends StoreKey>(key: K, data: StoreMap[K]): void {
  const tmp = `${FILES[key]}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, FILES[key]);
}

// Serialize read-modify-write operations so concurrent requests don't lose data.
let queue: Promise<unknown> = Promise.resolve();
export function update<K extends StoreKey, R>(key: K, mutator: (data: StoreMap[K]) => R): Promise<R> {
  const job = queue.then(() => {
    const data = read(key);
    const result = mutator(data);
    write(key, data);
    return result;
  });
  queue = job.catch(() => undefined);
  return job as Promise<R>;
}

export function logActivity(
  type: string,
  message: string,
  meta: Record<string, unknown> = {}
): Promise<unknown> {
  return update('activity', (activity) => {
    activity.unshift({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type,
      message,
      meta,
      createdAt: new Date().toISOString(),
    });
    if (activity.length > 200) activity.length = 200;
  });
}

export function normalizeEmail(email: string): string {
  return String(email || '').trim().toLowerCase();
}

export function normalizeWebsite(website: string): string {
  return String(website || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

export function isDuplicate(leads: Lead[], candidate: Partial<Lead>): boolean {
  const email = normalizeEmail(candidate.email || '');
  const website = normalizeWebsite(candidate.website || '');
  return leads.some((l) => {
    if (email && normalizeEmail(l.email) === email) return true;
    if (website && normalizeWebsite(l.website) === website) return true;
    return false;
  });
}

export { FILES };
