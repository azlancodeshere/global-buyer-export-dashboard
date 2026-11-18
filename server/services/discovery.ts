import * as store from '../store';
import type { DiscoveryResult, Lead } from '../types';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

interface SearchResult {
  url: string;
  title: string;
  snippet: string;
}

const SOURCE_HINTS: Record<string, string> = {
  'Google Maps': 'showroom store location contact',
  'Google Search': 'buyer importer contact email',
  LinkedIn: 'buyer purchasing manager LinkedIn',
  Facebook: 'facebook page business home decor store',
  'Business Directories': 'wholesaler distributor directory',
  'Company Websites': 'official website contact us',
  ImportYeti: 'import shipments importer home decor company',
  ThomasNet: 'wholesaler distributor home furnishing supplier',
  'Trade Shows': 'trade show exhibitor directory home gift',
  'US Business Directories': 'yellow pages yelp chamber of commerce business listing',
};

function decode(s = ''): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'");
}

function clean(s = ''): string {
  return decode(String(s).replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

async function fetchText(url: string, ms = 8000): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(ms),
      redirect: 'follow',
    });
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

function parseDDG(html: string): SearchResult[] {
  const out: SearchResult[] = [];
  const re = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    let url = decode(m[1]);
    if (url.includes('uddg=') || url.includes('duckduckgo.com/l/')) {
      try {
        const parsed = new URL(url, 'https://duckduckgo.com');
        url = decodeURIComponent(parsed.searchParams.get('uddg') || url);
      } catch {
        /* keep original */
      }
    }
    if (!/^https?:\/\//i.test(url)) continue;
    out.push({ url, title: clean(m[2]), snippet: '' });
    if (out.length >= 12) break;
  }
  const sre = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let s: RegExpExecArray | null;
  let i = 0;
  while ((s = sre.exec(html)) && i < out.length) {
    out[i].snippet = clean(s[1]);
    i += 1;
  }
  return out;
}

async function serperSearch(query: string): Promise<SearchResult[] | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, num: 12 }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { organic?: Array<{ link: string; title: string; snippet: string }> };
    return (json.organic || []).map((r) => ({
      url: r.link,
      title: clean(r.title),
      snippet: clean(r.snippet),
    }));
  } catch {
    return null;
  }
}

async function cseSearch(query: string): Promise<SearchResult[] | null> {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return null;
  try {
    const url = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(
      key
    )}&cx=${encodeURIComponent(cx)}&num=10&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!res.ok) return null;
    const json = (await res.json()) as { items?: Array<{ link: string; title: string; snippet: string }> };
    return (json.items || []).map((r) => ({
      url: r.link,
      title: clean(r.title),
      snippet: clean(r.snippet),
    }));
  } catch {
    return null;
  }
}

// Domains that never belong to a real buyer — analytics, error tracking and CDNs.
const NOISE_DOMAINS = new Set([
  'sentry.io', 'ingest.sentry.io', 'bugsnag.com', 'raygun.io', 'honeybadger.io',
  'google-analytics.com', 'analytics.google.com', 'doubleclick.net', 'hotjar.com',
  'mixpanel.com', 'segment.com', 'amplitude.com', 'fullstory.com', 'clarity.ms',
  'facebook.com', 'facebook.net', 'twitter.com', 'typekit.net', 'fonts.googleapis.com',
  'w3.org', 'schema.org', 'example.com', 'example.org', 'localhost',
]);

async function extractContacts(url: string): Promise<{ emails: string[]; phones: string[] }> {  const pages = [url];
  try {
    const u = new URL(url);
    pages.push(`${u.origin}/contact`, `${u.origin}/contact-us`, `${u.origin}/pages/contact`);
  } catch {
    /* ignore */
  }
  const emails = new Set<string>();
  const phones = new Set<string>();

  for (const page of pages.slice(0, 3)) {
    const html = await fetchText(page, 6000);
    if (!html) continue;
    const text = clean(html);
    for (const raw of text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []) {
      const em = raw.toLowerCase();
      if (/\.(png|jpe?g|gif|svg|webp)$/.test(em)) continue;
      if (/^(noreply|no-reply|donotreply|example|test|your|sentry|admin@localhost)/.test(em)) continue;
      if (em.length > 60) continue;
      // Skip machine-generated / tracking addresses (Sentry, PostHog, analytics…).
      if (NOISE_DOMAINS.has(em.split('@')[1])) continue;
      if (/[0-9a-f]{16,}/.test(em.split('@')[0])) continue;
      emails.add(em);
    }
    for (const raw of text.match(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) || []) {
      if (raw.replace(/\D/g, '').length >= 10) phones.add(raw.trim());
    }
    if (emails.size && phones.size) break;
  }
  return { emails: [...emails].slice(0, 3), phones: [...phones].slice(0, 2) };
}

// Full state names → 2-letter codes, so "Houston, Texas, United States" parses correctly.
const STATE_CODE: Record<string, string> = {
  texas: 'TX', california: 'CA', 'new york': 'NY', florida: 'FL', illinois: 'IL',
  washington: 'WA', georgia: 'GA', massachusetts: 'MA', colorado: 'CO', pennsylvania: 'PA',
  ontario: 'ON', 'british columbia': 'BC', alberta: 'AB',
  england: 'ENG', scotland: 'SCT', wales: 'WLS',
  'new south wales': 'NSW', victoria: 'VIC', queensland: 'QLD',
  dubai: 'DXB', bavaria: 'BY', berlin: 'BE', 'north rhine-westphalia': 'NW',
};

const COUNTRIES = new Set([
  'united states', 'usa', 'canada', 'united kingdom', 'uk', 'australia',
  'united arab emirates', 'uae', 'germany',
]);

function splitLocation(location = ''): { city: string; state: string; country: string } {
  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return { city: '', state: '', country: 'United States' };

  const isCountry = (v: string) => COUNTRIES.has(v.toLowerCase());
  const codeOf = (v: string) => STATE_CODE[v.toLowerCase()] || (/^[A-Za-z]{2}$/.test(v) ? v.toUpperCase() : v.toUpperCase().slice(0, 2));

  // "City, State, Country"
  if (parts.length >= 3 && isCountry(parts[parts.length - 1])) {
    return { city: parts[0], state: codeOf(parts[1]), country: parts[parts.length - 1] };
  }
  // "State, Country" — no city chosen yet (video's state-level narrowing step).
  if (parts.length === 2 && isCountry(parts[1])) {
    return { city: '', state: codeOf(parts[0]), country: parts[1] };
  }
  // "City, Country"
  if (parts.length === 2 && isCountry(parts[0])) {
    return { city: parts[1], state: '', country: parts[0] };
  }
  return {
    city: parts[0] || '',
    state: parts[1] ? codeOf(parts[1]) : '',
    country: parts[2] || 'United States',
  };
}

function companyFromResult(result: SearchResult, fallback: string): string {
  if (!result.title) return fallback;
  let name = result.title.split(/[|–—\-:]/)[0].trim();
  name = name.replace(/\s*(official site|home|contact us|website)\s*$/i, '').trim();
  return name.slice(0, 60) || fallback;
}

function sampleLeads(opts: {
  product: string;
  location: string;
  source: string;
  limit: number;
}): Partial<Lead>[] {
  const { product, location, source, limit } = opts;
  const { city, state, country } = splitLocation(location);
  const first = ['Michael', 'Sarah', 'David', 'Priya', 'James', 'Emily', 'Robert', 'Ava', 'Linda', 'Chris'];
  const last = ['Carter', 'Williams', 'Thompson', 'Sharma', 'Miller', 'Davis', 'Brown', 'Martinez', 'Nguyen', 'Anderson'];
  const noun = product.toLowerCase().includes('singing') ? 'Sound' : 'Home';
  const nouns = [`${noun} Decor`, 'Wellness Studio', 'Imports Co', 'Showroom', 'Wellness Store', 'Trading House'];
  return Array.from({ length: limit }, (_, i): Partial<Lead> => {
    const company = `${city || 'US'} ${nouns[i % nouns.length]} ${i + 1}`;
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 22);
    return {
      name: `${first[i % first.length]} ${last[i % last.length]}`,
      company,
      email: `info@${slug}${i}.com`,
      phone: `+1 555-${String(100 + i).padStart(3, '0')}-${String(1000 + i * 37).padStart(4, '0')}`,
      website: `${slug}${i}.com`,
      source,
      product,
      city: city || 'Houston',
      state: state || 'TX',
      country,
    };
  });
}

export async function discoverBuyers(opts: {
  product: string;
  location: string;
  sources: string[];
  limit: number;
}): Promise<DiscoveryResult> {
  const { product, location, limit } = opts;
  const loc = (location || 'Houston, TX, United States').trim();
  const selectedSources =
    Array.isArray(opts.sources) && opts.sources.length ? opts.sources : ['Google Search'];

  // Run one search per selected source so multi-select actually works,
  // then merge and de-duplicate the results by URL.
  const merged = new Map<string, SearchResult & { source: string }>();
  const engines: string[] = [];

  for (const source of selectedSources) {
    const hint = SOURCE_HINTS[source] || SOURCE_HINTS['Google Search'];
    const query = `"${product}" ${hint} ${loc}`;

    let batch: SearchResult[] | null = await serperSearch(query);
    let engine = 'Serper (Google)';
    if (!batch) {
      batch = await cseSearch(query);
      engine = 'Google Custom Search';
    }
    if (!batch) {
      const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, 9000);
      batch = parseDDG(html);
      engine = 'DuckDuckGo HTML';
    }
    if (batch.length) engines.push(`${source} · ${engine}`);

    for (const r of batch) {
      if (!merged.has(r.url)) merged.set(r.url, { ...r, source });
    }
  }

  // Interleave round-robin so every selected source contributes leads
  // instead of the first source filling the whole slice.
  const bySource = new Map<string, Array<SearchResult & { source: string }>>();
  for (const r of merged.values()) {
    const list = bySource.get(r.source) || [];
    list.push(r);
    bySource.set(r.source, list);
  }
  const results: Array<SearchResult & { source: string }> = [];
  const pools = selectedSources
    .map((s) => bySource.get(s) || [])
    .filter((p) => p.length);
  for (let i = 0; pools.length && i < Math.max(...pools.map((p) => p.length)); i += 1) {
    for (const pool of pools) if (pool[i]) results.push(pool[i]);
  }

  let engine = engines.length ? [...new Set(engines.map((e) => e.split(' · ')[1]))].join(' + ') : 'No engine results';
  const query = selectedSources.map((s) => `"${product}" ${SOURCE_HINTS[s] || ''} ${loc}`).join('  |  ');

  let fallback = results.length < 2;
  if (fallback) {
    engine = 'Sample Dataset (offline fallback)';
  }

  const existing = store.read('leads');
  const created: Partial<Lead>[] = [];
  let contactsFound = 0;

  if (fallback) {
    // Spread the sample rows across every selected source so each platform is represented.
    const perSource = Math.max(1, Math.ceil(limit / selectedSources.length));
    for (const source of selectedSources) {
      if (created.length >= limit) break;
      for (const lead of sampleLeads({ product, location: loc, source, limit: perSource })) {
        if (created.length >= limit) break;
        if (store.isDuplicate(existing.concat(created as Lead[]), lead)) continue;
        created.push(lead);
      }
    }
  } else {
    for (const result of results.slice(0, Math.max(limit * 2, 10))) {
      if (created.length >= limit) break;
      const contacts = await extractContacts(result.url);
      if (!contacts.emails.length && !contacts.phones.length) continue;
      contactsFound += 1;
      const lead: Partial<Lead> = {
        name: companyFromResult(result, 'Buyer Contact'),
        company: companyFromResult(result, 'Buyer Company'),
        email: contacts.emails[0] || '',
        phone: contacts.phones[0] || '',
        website: (() => {
          try {
            return new URL(result.url).hostname.replace(/^www\./, '');
          } catch {
            return '';
          }
        })(),
        source: result.source,
        product,
        city: splitLocation(loc).city,
        state: splitLocation(loc).state,
        country: splitLocation(loc).country,
      };
      if (!lead.email && !lead.phone) continue;
      if (store.isDuplicate(existing.concat(created as Lead[]), lead)) continue;
      created.push(lead);
    }
    if (!created.length) {
      engine = 'Sample Dataset (no contacts found)';
      fallback = true;
      const perSource = Math.max(1, Math.ceil(limit / selectedSources.length));
      for (const source of selectedSources) {
        if (created.length >= limit) break;
        for (const lead of sampleLeads({ product, location: loc, source, limit: perSource })) {
          if (created.length >= limit) break;
          if (store.isDuplicate(existing.concat(created as Lead[]), lead)) continue;
          created.push(lead);
        }
      }
    }
  }

  const withIds: Lead[] = created.map((lead, i): Lead => ({
    id: `lead_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
    name: lead.name || '',
    company: lead.company || '',
    email: lead.email || '',
    phone: lead.phone || '',
    website: lead.website || '',
    source: lead.source || selectedSources[0] || 'Google Search',
    product: lead.product || product,
    city: lead.city || '',
    state: lead.state || '',
    country: lead.country || 'United States',
    classification: 'unclassified',
    classificationConfidence: null,
    classificationReason: '',
    emailStatus: lead.email ? 'unchecked' : 'invalid',
    emailCheckedAt: null,
    emailed: false,
    dateAdded: new Date().toISOString(),
  }));

  return {
    leads: withIds,
    meta: { engine, query, results: results.length, contactsFound, fallback },
  };
}
