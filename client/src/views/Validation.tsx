import { useState } from 'react';
import { ShieldCheck, Trash2, MailCheck, MailX, AlertTriangle, Clock3, RefreshCw, CheckCircle2 } from 'lucide-react';
import { api } from '../api';
import { Card, PageHead, StatCard, EmailBadge, Empty, fmtDateTime } from '../components/ui';
import type { SharedProps } from '../types';

interface ValidationRun {
  checked: number;
  valid: number;
  invalid: number;
  suspect: number;
}

export default function Validation({ leads, stats, notify, refresh, runBusy, goTo }: SharedProps) {
  const [run, setRun] = useState<ValidationRun | null>(null);

  const runValidation = async (ids?: string[]) => {
    try {
      const res = await runBusy('Checking email syntax and DNS/MX records…', () =>
        api.post<ValidationRun>('/validation/run', ids && ids.length ? { ids } : {})
      );
      setRun(res);
      notify('success', 'Validation complete', `${res.checked} checked · ${res.valid} valid · ${res.invalid} invalid.`);
      await refresh();
    } catch (err) {
      notify('error', 'Validation failed', (err as Error).message);
    }
  };

  const removeInvalid = async () => {
    const invalid = leads.filter((l) => l.emailStatus === 'invalid');
    if (!invalid.length) return notify('info', 'Nothing to remove', 'No invalid emails found.');
    try {
      await runBusy(`Removing ${invalid.length} invalid contacts…`, async () => {
        for (const l of invalid) await api.delete(`/leads/${l.id}`);
      });
      notify('success', 'Database cleaned', `${invalid.length} invalid buyers removed.`);
      await refresh();
    } catch (err) {
      notify('error', 'Cleanup failed', (err as Error).message);
    }
  };

  const unchecked = leads.filter((l) => l.emailStatus === 'unchecked');

  return (
    <>
      <PageHead title="Email Validation" subtitle="Remove invalid addresses and protect your sender reputation before outreach.">
        <button className="btn btn-ghost" onClick={() => unchecked.length ? runValidation(unchecked.map((l) => l.id)) : notify('info', 'All checked', 'No unchecked emails remain.')}>
          <RefreshCw size={14} /> Validate unchecked
        </button>
        <button className="btn btn-primary" onClick={() => runValidation()}><ShieldCheck size={14} /> Validate all emails</button>
      </PageHead>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Valid emails" value={stats?.validEmails ?? 0} icon={MailCheck} tone="green" foot="Ready to send" />
        <StatCard label="Invalid emails" value={stats?.invalidEmails ?? 0} icon={MailX} tone="red" foot="Should be removed" />
        <StatCard label="Suspect" value={stats?.suspectEmails ?? 0} icon={AlertTriangle} tone="amber" foot="No MX record or DNS timeout" />
        <StatCard label="Unchecked" value={stats?.uncheckedEmails ?? 0} icon={Clock3} tone="indigo" foot="Not validated yet" />
      </div>

      {run && (
        <div className="callout green" style={{ marginBottom: 16 }}>
          <CheckCircle2 size={16} />
          <div>
            <strong>Last run:</strong> {run.checked} emails checked — {run.valid} valid, {run.suspect} suspect, {run.invalid} invalid.
          </div>
        </div>
      )}

      <Card
        title="Email health by buyer"
        subtitle="Validation uses syntax checks, disposable-domain filtering and live DNS MX lookups."
        action={<button className="btn btn-danger btn-sm" onClick={removeInvalid}><Trash2 size={13} /> Remove invalid</button>}
      >
        {leads.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Buyer</th><th>Email address</th><th>Status</th><th>Last checked</th><th className="hide-sm">Product</th><th className="hide-sm">Source</th></tr></thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id}>
                    <td><div className="cell-main">{l.company}</div><div className="cell-sub">{l.name}</div></td>
                    <td className="cell-email">{l.email || '—'}</td>
                    <td><EmailBadge status={l.emailStatus} /></td>
                    <td>{fmtDateTime(l.emailCheckedAt)}</td>
                    <td className="hide-sm">{l.product}</td>
                    <td className="hide-sm">{l.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty text="No buyers to validate yet." />}
      </Card>

      <div className="callout blue" style={{ marginTop: 16 }}>
        <ShieldCheck size={16} />
        <div>
          <strong>Why this matters.</strong> The video stresses sending only to correct, non-duplicate emails.
          Invalid addresses cause bounces and spam flags, which can stop your outreach from being delivered at all.
          After validation, continue to <button className="btn btn-soft btn-sm" style={{ marginLeft: 6 }} onClick={() => goTo('classification')}>AI classification</button>
        </div>
      </div>
    </>
  );
}
