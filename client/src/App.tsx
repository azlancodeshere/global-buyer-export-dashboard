import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, Search, Users, ShieldCheck, Sparkles, Send,
  BarChart3, Settings2, Globe2, CheckCircle2, AlertCircle, X, RefreshCw, Menu,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { api } from './api';
import type { Config, Lead, NotifyFn, SharedProps, Stats } from './types';
import Overview from './views/Overview';
import Discovery from './views/Discovery';
import Leads from './views/Leads';
import Validation from './views/Validation';
import Classification from './views/Classification';
import Outreach from './views/Outreach';
import Reports from './views/Reports';
import Integrations from './views/Integrations';

type PageId =
  | 'overview' | 'discovery' | 'leads' | 'validation'
  | 'classification' | 'outreach' | 'reports' | 'integrations';

const NAV: Array<{ id: PageId; label: string; icon: LucideIcon }> = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'discovery', label: 'Buyer Discovery', icon: Search },
  { id: 'leads', label: 'Buyers / Leads', icon: Users },
  { id: 'validation', label: 'Email Validation', icon: ShieldCheck },
  { id: 'classification', label: 'AI Classification', icon: Sparkles },
  { id: 'outreach', label: 'Outreach / Gmail', icon: Send },
  { id: 'reports', label: 'Reports & Data', icon: BarChart3 },
  { id: 'integrations', label: 'Integrations', icon: Settings2 },
];

const TITLES: Record<PageId, [string, string]> = {
  overview: ['Overview', 'Your export pipeline at a glance'],
  discovery: ['Buyer Discovery', 'Find buyers and importers for your products across countries'],
  leads: ['Buyers / Leads', 'Your organized, outreach-ready buyer database'],
  validation: ['Email Validation', 'Verify email deliverability and remove invalid contacts'],
  classification: ['AI Classification', 'Separate business buyers from individual contacts using AI'],
  outreach: ['Outreach / Gmail', 'Send personalized emails with your product presentation attached'],
  reports: ['Reports & Data', 'Pipeline analytics, activity history and data export'],
  integrations: ['Integrations', 'Connection status and setup instructions'],
};

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  msg: string;
}

export default function App() {
  const [page, setPage] = useState<PageId>('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [preselect, setPreselect] = useState<string[]>([]);
  const [navOpen, setNavOpen] = useState(false);

  const notify: NotifyFn = useCallback((type, title, msg = '') => {
    const id = `${Date.now()}_${Math.random()}`;
    setToasts((t) => [...t, { id, type, title, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5500);
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, c, l] = await Promise.all([
        api.get<Stats>('/stats'),
        api.get<Config>('/config'),
        api.get<Lead[]>('/leads'),
      ]);
      setStats(s);
      setConfig(c);
      setLeads(l);
    } catch {
      notify('error', 'Cannot reach the API', 'Start the backend with npm run dev:server (port 5001).');
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);

  const runBusy = useCallback(async <T,>(message: string, fn: () => Promise<T>): Promise<T> => {
    setBusy(message);
    try {
      return await fn();
    } finally {
      setBusy(null);
    }
  }, []);

  const goTo = useCallback((id: string, opts: { leadIds?: string[] } = {}) => {
    if (opts.leadIds) setPreselect(opts.leadIds);
    setPage(id as PageId);
    setNavOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Close the mobile drawer when resizing past the breakpoint.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)');
    const onChange = () => { if (mq.matches) setNavOpen(false); };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const shared: SharedProps = { notify, refresh: load, runBusy, goTo, config, stats, leads };

  let content;
  switch (page) {
    case 'discovery':
      content = <Discovery {...shared} />;
      break;
    case 'leads':
      content = <Leads {...shared} setPreselect={setPreselect} />;
      break;
    case 'validation':
      content = <Validation {...shared} />;
      break;
    case 'classification':
      content = <Classification {...shared} />;
      break;
    case 'outreach':
      content = <Outreach {...shared} preselect={preselect} setPreselect={setPreselect} />;
      break;
    case 'reports':
      content = <Reports {...shared} />;
      break;
    case 'integrations':
      content = <Integrations {...shared} />;
      break;
    default:
      content = <Overview {...shared} />;
  }

  const renderNav = (items: typeof NAV) =>
    items.map(({ id, label, icon: Icon }) => (
      <button key={id} className={`nav-item ${page === id ? 'active' : ''}`} onClick={() => goTo(id)}>
        <Icon size={17} />
        <span>{label}</span>
      </button>
    ));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${navOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark"><Globe2 size={19} /></div>
          <div>
            <div className="brand-name">Global Buyer</div>
            <div className="brand-sub">Export Dashboard</div>
          </div>
        </div>

        <div className="nav-label">Workspace</div>
        {renderNav(NAV.slice(0, 4))}

        <div className="nav-label">Automation</div>
        {renderNav(NAV.slice(4, 6))}

        <div className="nav-label">System</div>
        {renderNav(NAV.slice(6))}

        <div className="sidebar-foot">
          <p>Focus product<br /><strong style={{ color: '#cbd5e1' }}>Singing Bowls / Home Décor</strong><br />Target market: United States</p>
        </div>
      </aside>

      {navOpen && (
        <button
          className="sidebar-backdrop open"
          aria-label="Close navigation menu"
          onClick={() => setNavOpen(false)}
        />
      )}

      <main className="main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-btn menu-btn"
              title="Open menu"
              aria-label="Open navigation menu"
              aria-expanded={navOpen}
              onClick={() => setNavOpen((o) => !o)}
            >
              <Menu size={19} />
            </button>
            <div style={{ minWidth: 0 }}>
              <div className="topbar-title">{TITLES[page][0]}</div>
              <div className="topbar-sub">{TITLES[page][1]}</div>
            </div>
          </div>
          <div className="topbar-right">
            <span className={`status-pill ${config?.gemini ? 'on' : 'warn'}`}>
              <span className="dot" /> Gemini {!config ? 'Connecting…' : config.gemini ? 'Connected' : 'Not set'}
            </span>
            <span className={`status-pill ${config?.mail === 'demo' ? 'warn' : 'on'}`}>
              <span className="dot" /> Mail: {!config ? 'Connecting…' : config.mail === 'demo' ? 'Demo' : config.mail === 'smtp' ? 'SMTP' : 'Gmail API'}
            </span>
            <button className="icon-btn" title="Refresh data" onClick={load}><RefreshCw size={16} /></button>
            <div className="avatar">GB</div>
          </div>
        </header>

        <div className="page">{content}</div>
      </main>

      {busy && (
        <div className="loading-overlay">
          <div className="loading-box"><span className="spinner dark" /> {busy}</div>
        </div>
      )}

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              {t.type === 'error' ? <AlertCircle size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#10b981" />}
              <div style={{ flex: 1 }}>
                <div className="toast-title">{t.title}</div>
                {t.msg && <div className="toast-msg">{t.msg}</div>}
              </div>
              <button className="icon-btn" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>
                <X size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
