import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { Sparkles, WandSparkles, CheckCircle2, AlertCircle, Building2, UserRound } from 'lucide-react';
import { api } from '../api';
import { Card, PageHead, StatCard, ClassBadge, EmailBadge, ConfidenceBar, Empty, Badge } from '../components/ui';
import type { SharedProps } from '../types';

interface ClassifyRun {
  engine: string;
  classified: number;
  business: number;
  individual: number;
}

const COLORS = ['#8b5cf6', '#0ea5e9', '#cbd5e1'];

export default function Classification({ leads, stats, config, notify, refresh, runBusy }: SharedProps) {
  const [run, setRun] = useState<ClassifyRun | null>(null);
  const unclassified = leads.filter((l) => l.classification === 'unclassified');

  const classify = async (ids?: string[]) => {
    try {
      const res = await runBusy('Classifying buyers with AI…', () =>
        api.post<ClassifyRun>('/classify/run', ids && ids.length ? { ids } : {})
      );
      setRun(res);
      notify('success', 'Classification complete', `${res.engine} · ${res.business} business, ${res.individual} individual.`);
      await refresh();
    } catch (err) {
      notify('error', 'Classification failed', (err as Error).message);
    }
  };

  const distribution = [
    { name: 'Business', value: stats?.businessBuyers ?? 0 },
    { name: 'Individual', value: stats?.individualBuyers ?? 0 },
    { name: 'Unclassified', value: stats?.unclassified ?? 0 },
  ].filter((d) => d.value > 0);

  return (
    <>
      <PageHead title="AI Classification" subtitle="Automatically separate companies and resellers from individual buyers so your B2B outreach stays focused.">
        <button className="btn btn-ghost" onClick={() => unclassified.length ? classify(unclassified.map((l) => l.id)) : notify('info', 'Nothing pending', 'All buyers are already classified.')}>
          Classify unclassified ({unclassified.length})
        </button>
        <button className="btn btn-primary" onClick={() => classify()}><Sparkles size={14} /> Run AI classification</button>
      </PageHead>

      <div className={`callout ${config?.gemini ? 'green' : 'amber'}`} style={{ marginBottom: 16 }}>
        {config?.gemini ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
        <div>
          {config?.gemini
            ? <>Gemini is connected using <strong>{config.geminiModel}</strong>. Classification calls the live Generative Language API.</>
            : <>No Gemini key detected. The app is using a built-in <strong>heuristic fallback</strong> (company/domain signals). Add <span className="code">GEMINI_API_KEY</span> to <span className="code">.env</span> and restart to enable live AI.</>}
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Business buyers" value={stats?.businessBuyers ?? 0} icon={Building2} tone="violet" foot="Priority B2B prospects" />
        <StatCard label="Individual buyers" value={stats?.individualBuyers ?? 0} icon={UserRound} tone="blue" foot="Usually deprioritized" />
        <StatCard label="Unclassified" value={stats?.unclassified ?? 0} icon={WandSparkles} tone="amber" foot="Waiting for AI" />
        <StatCard label="Total classified" value={(stats?.businessBuyers ?? 0) + (stats?.individualBuyers ?? 0)} icon={CheckCircle2} tone="green" foot={`out of ${leads.length} buyers`} />
      </div>

      {run && (
        <div className="callout green" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          <div><strong>Engine:</strong> {run.engine} · {run.classified} buyers processed.</div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: '320px 1fr', marginBottom: 16 }}>
        <Card title="Classification split" subtitle="Distribution of buyer types">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={3}>
                {distribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid #e5eaf2', fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            {distribution.map((d, i) => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5 }}>
                <span style={{ width: 9, height: 9, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                {d.name} <strong>{d.value}</strong>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Classified buyers" subtitle="Confidence score shows how certain the model is">
          {leads.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Company</th><th>Email</th><th>Type</th><th>Confidence</th><th>Reason</th></tr></thead>
                <tbody>
                  {leads.slice(0, 14).map((l) => (
                    <tr key={l.id}>
                      <td><div className="cell-main">{l.company}</div><div className="cell-sub">{l.name}</div></td>
                      <td><div className="cell-email" style={{ maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.email || '—'}</div><div className="cell-sub"><EmailBadge status={l.emailStatus} /></div></td>
                      <td><ClassBadge value={l.classification} /></td>
                      <td><ConfidenceBar value={l.classificationConfidence} /></td>
                      <td style={{ maxWidth: 260 }}><span className="hint">{l.classificationReason || 'Not classified yet'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <Empty text="No buyers to classify." />}
        </Card>
      </div>

      <div className="callout violet">
        <Badge tone="violet">Workflow</Badge>
        <div>Once classified, use <strong>Outreach / Gmail</strong> to email only the business buyers with valid addresses and your product presentation attached.</div>
      </div>
    </>
  );
}
