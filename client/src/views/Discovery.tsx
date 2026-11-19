import { useRef, useState } from 'react';
import {
  Search, MapPin, Upload, UserPlus, Sparkles, CheckCircle2, AlertCircle,
  FileSpreadsheet, Globe2, Linkedin, Building2, FileText, Plus, X,
  Facebook, Ship, Factory, CalendarDays, BookOpen, ChevronRight,
} from 'lucide-react';
import { api } from '../api';
import { Card, PageHead, Badge, Empty } from '../components/ui';
import type { SharedProps, Lead } from '../types';

const SOURCES = [
  { name: 'Google Maps', icon: MapPin },
  { name: 'Google Search', icon: Globe2 },
  { name: 'LinkedIn', icon: Linkedin },
  { name: 'Facebook', icon: Facebook },
  { name: 'Business Directories', icon: Building2 },
  { name: 'Company Websites', icon: FileText },
  { name: 'ImportYeti', icon: Ship },
  { name: 'ThomasNet', icon: Factory },
  { name: 'Trade Shows', icon: CalendarDays },
  { name: 'US Business Directories', icon: BookOpen },
];

// Country → state → city narrowing, exactly as demonstrated in the video.
const GEO: Record<string, Record<string, string[]>> = {
  'United States': {
    TX: ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
    CA: ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento'],
    NY: ['New York', 'Buffalo', 'Rochester', 'Albany'],
    FL: ['Miami', 'Orlando', 'Tampa', 'Jacksonville'],
    IL: ['Chicago', 'Naperville', 'Rockford', 'Springfield'],
    WA: ['Seattle', 'Tacoma', 'Spokane', 'Bellevue'],
    GA: ['Atlanta', 'Savannah', 'Augusta', 'Columbus'],
    MA: ['Boston', 'Worcester', 'Cambridge', 'Springfield'],
    CO: ['Denver', 'Colorado Springs', 'Boulder', 'Aurora'],
    PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie'],
  },
  Canada: {
    ON: ['Toronto', 'Ottawa', 'Hamilton', 'Mississauga'],
    BC: ['Vancouver', 'Victoria', 'Surrey', 'Kelowna'],
    AB: ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge'],
  },
  'United Kingdom': {
    ENG: ['London', 'Manchester', 'Birmingham', 'Leeds'],
    SCT: ['Glasgow', 'Edinburgh', 'Aberdeen', 'Dundee'],
    WLS: ['Cardiff', 'Swansea', 'Newport', 'Wrexham'],
  },
  Australia: {
    NSW: ['Sydney', 'Newcastle', 'Wollongong', 'Orange'],
    VIC: ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo'],
    QLD: ['Brisbane', 'Gold Coast', 'Cairns', 'Townsville'],
  },
  'United Arab Emirates': {
    DXB: ['Dubai', 'Sharjah', 'Ajman', 'Abu Dhabi'],
  },
  Germany: {
    BY: ['Munich', 'Nuremberg', 'Augsburg', 'Regensburg'],
    BE: ['Berlin', 'Potsdam', 'Cottbus', 'Frankfurt'],
    NW: ['Cologne', 'Düsseldorf', 'Dortmund', 'Essen'],
  },
};

const STATE_NAMES: Record<string, string> = {
  TX: 'Texas', CA: 'California', NY: 'New York', FL: 'Florida', IL: 'Illinois',
  WA: 'Washington', GA: 'Georgia', MA: 'Massachusetts', CO: 'Colorado', PA: 'Pennsylvania',
  ON: 'Ontario', BC: 'British Columbia', AB: 'Alberta',
  ENG: 'England', SCT: 'Scotland', WLS: 'Wales',
  NSW: 'New South Wales', VIC: 'Victoria', QLD: 'Queensland',
  DXB: 'Dubai', BY: 'Bavaria', BE: 'Berlin', NW: 'North Rhine-Westphalia',
};

interface DiscoveryResponse {
  engine: string;
  query: string;
  results: number;
  contactsFound: number;
  fallback: boolean;
  added: number;
  duplicates: number;
  leads: Lead[];
}

interface NewLead {
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  city: string;
  state: string;
}

const EMPTY_LEAD: NewLead = { name: '', company: '', email: '', phone: '', website: '', city: '', state: '' };

export default function Discovery({ notify, refresh, runBusy, config, goTo }: SharedProps) {
  const [product, setProduct] = useState('Singing Bowls');
  const [country, setCountry] = useState('United States');
  const [stateCode, setStateCode] = useState('TX');
  const [city, setCity] = useState('Houston');
  const [customLocation, setCustomLocation] = useState('');
  const [sources, setSources] = useState<string[]>(['Google Maps', 'Google Search']);
  const [limit, setLimit] = useState(8);
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [csvInfo, setCsvInfo] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newLead, setNewLead] = useState<NewLead>(EMPTY_LEAD);
  const fileRef = useRef<HTMLInputElement>(null);

  const states = Object.keys(GEO[country] || {});
  const cities = GEO[country]?.[stateCode] || [];

  // Free-text override wins; otherwise build "City, State, Country".
  // With no city picked, fall back to the state-level search shown in the video.
  const stateLabel = STATE_NAMES[stateCode] || stateCode;
  const location = customLocation.trim()
    ? customLocation.trim()
    : city
      ? [city, stateLabel, country].join(', ')
      : [stateLabel, country].join(', ');

  const onCountry = (c: string) => {
    setCountry(c);
    const firstState = Object.keys(GEO[c] || {})[0] || '';
    setStateCode(firstState);
    setCity(GEO[c]?.[firstState]?.[0] || '');
    setCustomLocation('');
  };
  const onState = (s: string) => {
    setStateCode(s);
    setCity(GEO[country]?.[s]?.[0] || '');
    setCustomLocation('');
  };

  const toggleSource = (name: string) =>
    setSources((prev) => (prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]));

  const runSearch = async () => {
    if (!sources.length) {
      notify('error', 'No sources selected', 'Pick at least one platform to search.');
      return;
    }
    try {
      const res = await runBusy(`Searching ${sources.length} source${sources.length === 1 ? '' : 's'} for buyers…`, () =>
        api.post<DiscoveryResponse>('/discovery/search', { product, location, sources, limit })
      );
      setResult(res);
      notify(
        'success',
        `Found ${res.added} new buyer${res.added === 1 ? '' : 's'}`,
        `${res.duplicates} duplicate${res.duplicates === 1 ? '' : 's'} skipped · ${sources.length} source${sources.length === 1 ? '' : 's'} · ${res.engine}`
      );
      await refresh();
    } catch (err) {
      notify('error', 'Discovery failed', (err as Error).message);
    }
  };

  const handleCsv = async (file?: File) => {
    if (!file) return;
    try {
      const res = await runBusy('Importing leads from CSV…', () =>
        api.upload<{ added: number; duplicates: number }>('/leads/upload', file)
      );
      setCsvInfo(`Imported ${res.added} buyers · ${res.duplicates} duplicates skipped`);
      notify('success', 'CSV imported', setCsvInfoMessage(res));
      await refresh();
    } catch (err) {
      notify('error', 'Import failed', (err as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const addLead = async () => {
    if (!newLead.name || !newLead.company) {
      notify('error', 'Missing details', 'Name and company are required.');
      return;
    }
    try {
      await runBusy('Adding buyer…', () => api.post('/leads', newLead));
      notify('success', 'Buyer added', `${newLead.company} is now in your database.`);
      setShowModal(false);
      setNewLead(EMPTY_LEAD);
      await refresh();
    } catch (err) {
      notify('error', 'Could not add buyer', (err as Error).message);
    }
  };

  return (
    <>
      <PageHead
        title="Buyer Discovery"
        subtitle="Search multiple platforms for companies and people buying your product in target countries."
      >
        <button className="btn btn-ghost" onClick={() => setShowModal(true)}><UserPlus size={14} /> Add manually</button>
        <button className="btn btn-primary" onClick={runSearch}><Search size={14} /> Find buyers</button>
      </PageHead>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Search criteria" subtitle="Define the product, market and sources to scan">
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="label">Product / item</label>
            <input className="input" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. Singing Bowls" />
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label className="label">Target market — narrow country → state → city</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select className="select" value={country} onChange={(e) => onCountry(e.target.value)}>
                {Object.keys(GEO).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronRight size={14} color="#94a3b8" style={{ flex: '0 0 auto' }} />
              <select className="select" value={stateCode} onChange={(e) => onState(e.target.value)}>
                {states.map((s) => <option key={s} value={s}>{STATE_NAMES[s] || s}</option>)}
              </select>
              <ChevronRight size={14} color="#94a3b8" style={{ flex: '0 0 auto' }} />
              <select className="select" value={cities.includes(city) ? city : ''} onChange={(e) => { setCity(e.target.value); setCustomLocation(''); }}>
                <option value="">Choose city…</option>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <span className="hint">
              Searching one city at a time returns far more contactable results than a whole country — as shown in the video (United States → Texas → Houston).
            </span>
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label className="label">Or type a custom location</label>
            <input
              className="input"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="e.g. Portland, OR, United States"
            />
            <span className="hint">
              Active search location: <strong>{location || '—'}</strong>
            </span>
          </div>

          <div className="field" style={{ marginBottom: 14 }}>
            <label className="label">Sources ({sources.length} selected)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SOURCES.map(({ name, icon: Icon }) => (
                <button key={name} className={`chip ${sources.includes(name) ? 'selected' : ''}`} onClick={() => toggleSource(name)}>
                  <Icon size={13} /> {name}
                </button>
              ))}
            </div>
            <span className="hint">Every selected platform is searched in one run and merged, with duplicates skipped.</span>
          </div>
          <div className="form-row filter-row">
            <div className="field">
              <label className="label">Max results</label>
              <select className="select" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                {[5, 8, 12, 20].map((n) => <option key={n} value={n}>{n} buyers</option>)}
              </select>
            </div>
            <div className="form-grow">
              <div className="callout blue">
                {config?.discovery === 'api'
                  ? <><CheckCircle2 size={15} /> Live search API configured. Results are scraped from real web pages.</>
                  : <><AlertCircle size={15} /> Keyless mode: live DuckDuckGo search + website scraping, with a sample dataset fallback when no network results are found.</>}
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card title="Import a lead file" subtitle="Already have buyers in a spreadsheet? Bring them in.">
            <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={(e) => handleCsv(e.target.files?.[0])} />
            <button
              className="btn btn-ghost"
              style={{ width: '100%', padding: '18px', borderStyle: 'dashed', height: 'auto' }}
              onClick={() => fileRef.current?.click()}
            >
              <Upload size={18} /> Choose CSV file to upload
            </button>
            <p className="hint" style={{ marginTop: 10, textAlign: 'center' }}>
              Supported columns: name, company, email, phone, website, source, product, city, state, country.<br />
              Duplicate emails or websites are skipped automatically.
            </p>
            {csvInfo && <div className="callout green" style={{ marginTop: 12 }}><CheckCircle2 size={15} /> {csvInfo}</div>}
          </Card>

          <Card title="How this matches the video" subtitle="Discovery workflow">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Pick one product', 'Start with a single category such as singing bowls or home décor.'],
                ['Search many platforms', 'Google Maps, Google Search, LinkedIn, directories and company sites.'],
                ['Narrow the geography', 'Country → state → city produces better, contactable results.'],
                ['Extract contact data', 'Capture buyer name, company, email, phone and website into one database.'],
              ].map(([title, text], i) => (
                <div key={title} style={{ display: 'flex', gap: 10 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#eef2ff', color: '#4f46e5',
                    display: 'grid', placeItems: 'center', fontSize: 11, fontWeight: 700, flex: '0 0 auto',
                  }}>{i + 1}</div>
                  <div><div style={{ fontSize: 12.5, fontWeight: 600 }}>{title}</div><div className="hint">{text}</div></div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {result && (
        <Card title="Last discovery run" subtitle="Results from the most recent search">
          <div className="grid grid-4" style={{ marginBottom: 14 }}>
            <div className="stat-inline"><strong>{result.results}</strong><span>search results</span></div>
            <div className="stat-inline"><strong style={{ color: '#10b981' }}>{result.added}</strong><span>new buyers</span></div>
            <div className="stat-inline"><strong style={{ color: '#f59e0b' }}>{result.duplicates}</strong><span>duplicates skipped</span></div>
            <div className="stat-inline"><strong>{result.contactsFound}</strong><span>sites with contacts</span></div>
          </div>
          <div className="callout blue" style={{ marginBottom: 12 }}><Sparkles size={15} /> Engine: <strong>{result.engine}</strong> · Query: <span className="code">{result.query}</span></div>
          {result.leads.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Company</th><th>Contact</th><th>Email</th><th className="hide-sm">Phone</th><th>Location</th></tr></thead>
                <tbody>
                  {result.leads.slice(0, 12).map((l) => (
                    <tr key={l.id}>
                      <td className="cell-main">{l.company}</td>
                      <td>{l.name}</td>
                      <td className="cell-email">{l.email || '—'}</td>
                      <td className="hide-sm">{l.phone || '—'}</td>
                      <td>{l.city}, {l.state}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty title="No new buyers" text="All results were duplicates. Try a different city or product keyword." />}
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={() => goTo('leads')}>View all buyers</button>
            <button className="btn btn-ghost btn-sm" onClick={() => goTo('validation')}>Validate emails</button>
          </div>
        </Card>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3><Plus size={16} style={{ verticalAlign: -3, marginRight: 6 }} /> Add a buyer manually</h3>
              <button className="icon-btn" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                {([
                  ['name', 'Contact name'], ['company', 'Company name'], ['email', 'Email address'],
                  ['phone', 'Phone number'], ['website', 'Website'], ['city', 'City'], ['state', 'State'],
                ] as Array<[keyof NewLead, string]>).map(([key, label]) => (
                  <div className="field" key={key}>
                    <label className="label">{label}</label>
                    <input className="input" value={newLead[key]} onChange={(e) => setNewLead({ ...newLead, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={addLead}>Save buyer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function setCsvInfoMessage(res: { added: number; duplicates: number }): string {
  return `${res.added} buyers imported, ${res.duplicates} duplicates skipped.`;
}
