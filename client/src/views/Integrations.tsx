import { CheckCircle2, AlertCircle, KeyRound, Globe2, Mail, Database, ArrowRight, FileText, Sparkles } from 'lucide-react';
import { PageHead, Card, Badge } from '../components/ui';
import type { SharedProps } from '../types';

export default function Integrations({ config, stats, goTo }: SharedProps) {
  const integrations = [
    {
      title: 'Gemini AI',
      icon: Sparkles,
      ok: Boolean(config?.gemini),
      description: 'Classifies each buyer as a business or individual contact.',
      env: ['GEMINI_API_KEY', 'GEMINI_MODEL'],
      note: config?.gemini ? `Connected with ${config.geminiModel}.` : 'Add your key to .env and restart the app.',
    },
    {
      title: 'Buyer discovery',
      icon: Globe2,
      ok: config?.discovery === 'api',
      description: 'Finds buyers across search engines, maps, LinkedIn and directories.',
      env: ['SERPER_API_KEY', 'GOOGLE_CSE_KEY', 'GOOGLE_CSE_CX'],
      note: config?.discovery === 'api' ? 'Live search API is configured.' : 'Keyless mode with DuckDuckGo + scraping and a sample fallback.',
    },
    {
      title: 'Gmail / SMTP sender',
      icon: Mail,
      ok: config?.mail !== 'demo',
      description: 'Sends personalized outreach with your product PDF attached.',
      env: ['SMTP_USER', 'SMTP_PASS', 'GMAIL_CLIENT_ID', 'GMAIL_CLIENT_SECRET', 'GMAIL_REFRESH_TOKEN'],
      note: config?.mail === 'demo' ? 'Demo mode: sends are logged only.' : `Sending via ${config?.mail === 'smtp' ? 'SMTP' : 'Gmail API'}.`,
    },
    {
      title: 'Data storage',
      icon: Database,
      ok: true,
      description: 'Stores leads, email history and activity locally as JSON files.',
      env: [],
      note: `server/data/leads.json — ${stats?.totalLeads ?? 0} buyers stored.`,
    },
  ];

  return (
    <>
      <PageHead title="Integrations" subtitle="Connection status and setup guide for every module in the dashboard." />

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        {integrations.map(({ title, icon: Icon, ok, description, env, note }) => (
          <Card key={title}>
            <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
              <div className="card-icon" style={{ background: ok ? '#ecfdf5' : '#fffbeb', color: ok ? '#10b981' : '#f59e0b' }}>
                <Icon size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <h3 className="card-title">{title}</h3>
                  <Badge tone={ok ? 'green' : 'amber'} dot>{ok ? 'Active' : 'Fallback'}</Badge>
                </div>
                <p className="card-sub" style={{ marginBottom: 10 }}>{description}</p>
                <div className={`callout ${ok ? 'green' : 'amber'}`}>
                  {ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                  <div>{note}</div>
                </div>
                {env.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div className="label" style={{ marginBottom: 6 }}>Environment variables</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {env.map((e) => <span key={e} className="code">{e}</span>)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-2">
        <Card title="Setup steps" subtitle="Getting from demo mode to a fully live pipeline">
          <ol style={{ paddingLeft: 18, lineHeight: 1.9, fontSize: 12.5, margin: 0 }}>
            <li>Open <span className="code">.env</span> in the project root.</li>
            <li>Paste your Gemini API key after <span className="code">GEMINI_API_KEY=</span>.</li>
            <li>(Optional) Add a Serper key for reliable live buyer discovery.</li>
            <li>(Optional) Add a Gmail App Password: <span className="code">SMTP_USER</span> and <span className="code">SMTP_PASS</span>.</li>
            <li>Restart with <span className="code">npm run dev</span>.</li>
          </ol>
        </Card>

        <Card title="Module coverage" subtitle="How the build maps to the assessment video">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {[
              ['Buyer discovery', 'Ten sources searched in one run: Google Maps, Search, LinkedIn, Facebook, directories, company sites, ImportYeti, ThomasNet, trade shows'],
              ['Location narrowing', 'Country → state → city selectors, exactly the technique shown in the video'],
              ['Data extraction', 'Name, company, email, phone, website, city, state stored per buyer'],
              ['Email validation', 'Syntax, disposable filter and live DNS MX lookup'],
              ['Gemini classification', 'Business vs individual with confidence and reasoning'],
              ['Gmail sender', 'Personalized templates, PDF attachment and delivery logging'],
              ['Duplicate prevention', 'Email + website checks on every insert and import'],
              ['Web interface & reporting', 'Eight dashboards, charts, CSV export and activity log'],
            ].map(([name, desc]) => (
              <div key={name} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <CheckCircle2 size={15} color="#10b981" style={{ marginTop: 2, flex: '0 0 auto' }} />
                <div><strong style={{ fontSize: 12.5 }}>{name}</strong><div className="hint">{desc}</div></div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" style={{ marginTop: 16 }} onClick={() => goTo('overview')}>
            Go to dashboard <ArrowRight size={13} />
          </button>
        </Card>
      </div>
    </>
  );
}
