import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Users, MailCheck, Building2, Send, ShieldOff, Database, ArrowRight, RefreshCw, Activity as ActivityIcon,
} from 'lucide-react';
import { Card, PageHead, StatCard, Badge, EmailBadge, ClassBadge, Empty, fmtDateTime } from '../components/ui';
import type { SharedProps } from '../types';

const COLORS = ['#4f46e5', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#6366f1', '#14b8a6'];

export default function Overview({ stats, goTo, refresh, notify }: SharedProps) {
  if (!stats) {
    return <Empty title="Loading dashboard…" text="Fetching your pipeline data from the API." />;
  }

  const chartTooltip = {
    contentStyle: { borderRadius: 10, border: '1px solid #e5eaf2', fontSize: 12 },
  };

  return (
    <>
      <PageHead
        title="Welcome back"
        subtitle="This is what is happening across your buyer discovery and outreach pipeline."
      >
        <button className="btn btn-ghost" onClick={() => { refresh(); notify('info', 'Refreshed', 'Dashboard data is up to date.'); }}>
          <RefreshCw size={14} /> Refresh
        </button>
        <button className="btn btn-primary" onClick={() => goTo('discovery')}>
          Find buyers <ArrowRight size={14} />
        </button>
      </PageHead>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Total buyers" value={stats.totalLeads} icon={Users} tone="indigo"
          foot={<><strong>+{stats.bySource[0]?.value || 0}</strong> from {stats.bySource[0]?.name || 'discovery'}</>}
          onClick={() => goTo('leads')} />
        <StatCard label="Valid emails" value={stats.validEmails} icon={MailCheck} tone="green"
          foot={<>{stats.invalidEmails} invalid · {stats.suspectEmails} suspect</>}
          onClick={() => goTo('validation')} />
        <StatCard label="Business buyers" value={stats.businessBuyers} icon={Building2} tone="violet"
          foot={<>{stats.individualBuyers} individual · {stats.unclassified} unclassified</>}
          onClick={() => goTo('classification')} />
        <StatCard label="Emails sent" value={stats.emailsSent + stats.demoSent} icon={Send} tone="blue"
          foot={<>{stats.demoSent} demo · {stats.emailsSent} live</>}
          onClick={() => goTo('outreach')} />
        <StatCard label="Duplicates blocked" value={stats.duplicatesBlocked} icon={ShieldOff} tone="amber"
          foot="Same email or website prevented" />
        <StatCard label="Discovery sources" value={stats.bySource.length} icon={Database} tone="indigo"
          foot="Google, LinkedIn, directories, ImportYeti and more" onClick={() => goTo('reports')} />
        <StatCard label="Unchecked emails" value={stats.uncheckedEmails} icon={MailCheck} tone="amber"
          foot="Ready for validation" onClick={() => goTo('validation')} />
        <StatCard label="Contacted buyers" value={stats.recentActivity.filter((a) => a.type === 'email').length} icon={ActivityIcon} tone="green"
          foot="Outreach campaigns logged" onClick={() => goTo('reports')} />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Leads by source" subtitle="Where your buyers are coming from">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={stats.bySource} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="value" name="Buyers" fill="#6366f1" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Buyer classification" subtitle="Business vs individual split">
          <div className="split-chart">
            <div className="split-chart-plot">
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={stats.classification} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                    {stats.classification.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...chartTooltip} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="split-chart-legend">
              {stats.classification.map((c, i) => (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                  <span style={{ flex: 1, color: '#64748b' }}>{c.name}</span>
                  <strong>{c.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Outreach funnel" subtitle="From discovery to first contact">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.outreachFunnel} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="funnel" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...chartTooltip} />
              <Area type="monotone" dataKey="value" name="Buyers" stroke="#8b5cf6" strokeWidth={2} fill="url(#funnel)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Top cities" subtitle="Your strongest US markets">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byCity.slice(0, 7)} layout="vertical" margin={{ top: 5, right: 15, left: 25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip {...chartTooltip} />
              <Bar dataKey="value" name="Buyers" fill="#0ea5e9" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-2">
        <Card
          title="Recently discovered buyers"
          subtitle="Newest contacts in your database"
          action={<button className="btn btn-soft btn-sm" onClick={() => goTo('leads')}>View all <ArrowRight size={13} /></button>}
        >
          {stats.recentLeads.length ? (
            <div className="table-wrap">
              <table className="table" style={{ minWidth: 560 }}>
                <thead><tr><th>Buyer</th><th>Source</th><th>Email</th><th>Type</th></tr></thead>
                <tbody>
                  {stats.recentLeads.map((l) => (
                    <tr key={l.id}>
                      <td><div className="cell-main">{l.company}</div><div className="cell-sub">{l.name} · {l.city}, {l.state}</div></td>
                      <td><Badge tone="gray">{l.source}</Badge></td>
                      <td><EmailBadge status={l.emailStatus} /></td>
                      <td><ClassBadge value={l.classification} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty text="No buyers yet. Run a discovery search first." />}
        </Card>

        <Card title="Recent activity" subtitle="What the automation has been doing">
          {stats.recentActivity.length ? (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {stats.recentActivity.map((a) => (
                <div key={a.id} style={{ display: 'flex', gap: 11, padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div className="card-icon" style={{ background: '#eef2ff', color: '#4f46e5', width: 30, height: 30, flex: '0 0 auto' }}>
                    <ActivityIcon size={15} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600 }}>{a.message}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{fmtDateTime(a.createdAt)}</div>
                  </div>
                  <Badge tone={a.type === 'email' ? 'blue' : a.type === 'discovery' ? 'violet' : 'gray'}>{a.type}</Badge>
                </div>
              ))}
            </div>
          ) : <Empty text="Activity will appear here as you use the dashboard." />}
        </Card>
      </div>
    </>
  );
}
