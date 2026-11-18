import { useEffect, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Download, Activity as ActivityIcon, Database, HardDrive, ShieldCheck, History } from 'lucide-react';
import { api } from '../api';
import { Card, PageHead, StatCard, Badge, Empty, fmtDateTime } from '../components/ui';
import type { SharedProps, Activity, Lead } from '../types';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#94a3b8'];

export default function Reports({ stats, leads, notify, runBusy }: SharedProps) {
  const [activity, setActivity] = useState<Activity[]>([]);

  useEffect(() => {
    api.get<Activity[]>('/activity').then(setActivity).catch(() => undefined);
  }, []);

  const exportCsv = async () => {
    try {
      await runBusy('Preparing export…', async () => {
        const data = await api.get<Lead[]>('/leads');
        const headers = ['Name', 'Company', 'Email', 'Phone', 'Website', 'Source', 'Product', 'City', 'State', 'Country', 'Classification', 'Email Status', 'Emailed'];
        const rows = data.map((l) => [l.name, l.company, l.email, l.phone, l.website, l.source, l.product, l.city, l.state, l.country, l.classification, l.emailStatus, l.emailed ? 'yes' : 'no']);
        const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const a = document.createElement('a');
        a.href = url;
        a.download = `buyer-database-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      });
      notify('success', 'Export ready', `${leads.length} buyers downloaded.`);
    } catch (err) {
      notify('error', 'Export failed', (err as Error).message);
    }
  };

  const tooltip = { contentStyle: { borderRadius: 10, border: '1px solid #e5eaf2', fontSize: 12 } };

  return (
    <>
      <PageHead title="Reports & Data" subtitle="Analytics, activity history and the data stored by your dashboard.">
        <button className="btn btn-primary" onClick={exportCsv}><Download size={14} /> Export buyer database</button>
      </PageHead>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Buyers stored" value={leads.length} icon={Database} tone="indigo" foot="In local JSON database" />
        <StatCard label="Duplicates blocked" value={stats?.duplicatesBlocked ?? 0} icon={ShieldCheck} tone="amber" foot="Across all imports" />
        <StatCard label="Activity events" value={stats?.recentActivity.length ?? 0} icon={History} tone="violet" foot="Recent log entries" />
        <StatCard label="Outreach emails" value={(stats?.emailsSent ?? 0) + (stats?.demoSent ?? 0)} icon={HardDrive} tone="blue" foot="Stored in history" />
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Buyers by city" subtitle="Geographic coverage of your prospect list">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.byCity.slice(0, 8) || []} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltip} />
              <Bar dataKey="value" name="Buyers" fill="#4f46e5" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Products in demand" subtitle="Which items your buyers are associated with">
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stats?.byProduct || []} margin={{ top: 5, right: 10, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip {...tooltip} />
              <Bar dataKey="value" name="Buyers" fill="#8b5cf6" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 16 }}>
        <Card title="Email health" subtitle="Deliverability status across the database">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ResponsiveContainer width="50%" height={230}>
              <PieChart>
                <Pie data={stats?.emailHealth || []} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={3}>
                  {(stats?.emailHealth || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip {...tooltip} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(stats?.emailHealth || []).map((h, i) => (
                <div key={h.name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                  <span style={{ flex: 1, color: '#64748b' }}>{h.name}</span><strong>{h.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Outreach funnel" subtitle="Discovery → validation → classification → contact">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={stats?.outreachFunnel || []} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eef2f7" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={90} />
              <Tooltip {...tooltip} />
              <Bar dataKey="value" name="Buyers" fill="#10b981" radius={[0, 5, 5, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Activity log" subtitle="Everything the automation has recorded">
        {activity.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Event</th><th>Type</th><th>Details</th><th>Time</th></tr></thead>
              <tbody>
                {activity.slice(0, 40).map((a) => (
                  <tr key={a.id}>
                    <td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ActivityIcon size={14} color="#64748b" /><span className="cell-main">{a.message}</span></div></td>
                    <td><Badge tone={a.type === 'email' ? 'blue' : a.type === 'discovery' ? 'violet' : a.type === 'classification' ? 'green' : 'gray'}>{a.type}</Badge></td>
                    <td><span className="hint">{Object.entries(a.meta || {}).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') || '—'}</span></td>
                    <td>{fmtDateTime(a.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon={ActivityIcon} text="Activity will appear as you use the dashboard." />}
      </Card>
    </>
  );
}
