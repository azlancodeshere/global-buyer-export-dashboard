import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Send, Search, Paperclip, Upload, Trash2, CheckCircle2, AlertCircle,
  Mail, FileText, X, Sparkles,
} from 'lucide-react';
import { api } from '../api';
import { Card, PageHead, Badge, EmailBadge, Empty, StatCard, fmtDateTime } from '../components/ui';
import type { EmailRecord, PresentationMeta, SharedProps } from '../types';

interface Props extends SharedProps {
  preselect: string[];
  setPreselect: (ids: string[]) => void;
}

interface SendResult {
  leadId: string;
  email: string;
  status: 'sent' | 'demo-sent' | 'failed' | 'skipped';
  detail: string;
}

interface SendResponse {
  mode: string;
  results: SendResult[];
}

const DEFAULT_SUBJECT = 'Handcrafted Singing Bowls & Home Décor from India — for {{company}}';
const DEFAULT_BODY = `Dear {{name}},

I hope this message finds you well.

We are a manufacturer and exporter based in India, specializing in handcrafted singing bowls and home décor products. We came across {{company}} in {{city}} and believe our products could be a great fit for your store.

I have attached our product presentation for your review. We would be happy to discuss pricing, samples and shipping options for {{product}}.

Would you be interested in learning more?

Best regards,
{{sender_name}}
Global Exports Team`;

export default function Outreach({ leads, config, notify, refresh, runBusy, preselect, setPreselect }: Props) {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);
  const [selected, setSelected] = useState<Set<string>>(new Set(preselect));
  const [search, setSearch] = useState('');
  const [attachment, setAttachment] = useState<PresentationMeta | null>(null);
  const [includeAttachment, setIncludeAttachment] = useState(true);
  const [sendResult, setSendResult] = useState<SendResponse | null>(null);
  const [history, setHistory] = useState<EmailRecord[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (preselect.length) setSelected(new Set(preselect));
  }, [preselect]);

  const loadExtras = async () => {
    try {
      const [meta, hist] = await Promise.all([
        api.get<PresentationMeta | null>('/presentation'),
        api.get<EmailRecord[]>('/outreach/history'),
      ]);
      setAttachment(meta);
      setHistory(hist);
    } catch {
      /* handled by other pages */
    }
  };
  useEffect(() => { loadExtras(); }, []);

  const candidates = useMemo(() => {
    const needle = search.toLowerCase();
    return leads
      .filter((l) => l.email && l.emailStatus !== 'invalid')
      .filter((l) => !needle || [l.company, l.name, l.email, l.city].join(' ').toLowerCase().includes(needle));
  }, [leads, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const uploadPresentation = async (file?: File) => {
    if (!file) return;
    try {
      const meta = await runBusy('Uploading presentation…', () => api.upload<PresentationMeta>('/presentation', file));
      setAttachment(meta);
      notify('success', 'Presentation uploaded', meta.filename);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      notify('error', 'Upload failed', (err as Error).message);
    }
  };

  const deletePresentation = async () => {
    try {
      await runBusy('Removing presentation…', () => api.delete('/presentation'));
      setAttachment(null);
      notify('success', 'Presentation removed');
    } catch (err) {
      notify('error', 'Could not remove presentation', (err as Error).message);
    }
  };

  const send = async () => {
    const ids = [...selected];
    if (!ids.length) return notify('error', 'No recipients', 'Select at least one buyer.');
    if (!subject.trim() || !body.trim()) return notify('error', 'Message incomplete', 'Subject and message are required.');
    if (includeAttachment && !attachment) {
      return notify('error', 'No presentation', 'Upload a PDF or turn off the attachment option.');
    }
    try {
      const res = await runBusy(`Sending outreach to ${ids.length} buyers…`, () =>
        api.post<SendResponse>('/outreach/send', { ids, subject, body, includeAttachment })
      );
      setSendResult(res);
      const ok = res.results.filter((r) => r.status === 'sent' || r.status === 'demo-sent').length;
      notify('success', 'Outreach complete', `${ok} of ${ids.length} emails processed (${res.mode} mode).`);
      setPreselect([]);
      await Promise.all([refresh(), loadExtras()]);
    } catch (err) {
      notify('error', 'Sending failed', (err as Error).message);
    }
  };

  const modeLabel = config?.mail === 'demo' ? 'Demo mode' : config?.mail === 'smtp' ? 'Gmail SMTP' : 'Gmail API';

  return (
    <>
      <PageHead title="Outreach / Gmail" subtitle="Send personalized outreach from your dashboard with your product presentation attached.">
        <Badge tone={config?.mail === 'demo' ? 'amber' : 'green'} dot>{modeLabel}</Badge>
        <button className="btn btn-primary" onClick={send}><Send size={14} /> Send {selected.size ? `to ${selected.size}` : ''}</button>
      </PageHead>

      {config?.mail === 'demo' && (
        <div className="callout amber" style={{ marginBottom: 16 }}>
          <AlertCircle size={16} />
          <div>
            <strong>Demo send mode.</strong> No Gmail credentials are configured, so emails are recorded in the history but not actually delivered.
            To send live, add <span className="code">SMTP_USER</span> + <span className="code">SMTP_PASS</span> (Gmail App Password) or Gmail OAuth credentials to <span className="code">.env</span> and restart.
          </div>
        </div>
      )}

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Recipients selected" value={selected.size} icon={Mail} tone="indigo" foot="Ready to email" />
        <StatCard label="Emails logged" value={history.length} icon={Send} tone="blue" foot="All time" />
        <StatCard label="Live sent" value={history.filter((h) => h.status === 'sent').length} icon={CheckCircle2} tone="green" foot="Via Gmail / SMTP" />
        <StatCard label="Demo sent" value={history.filter((h) => h.status === 'demo-sent').length} icon={Sparkles} tone="amber" foot="Simulated sends" />
      </div>

      <div className="grid compose-grid" style={{ marginBottom: 16 }}>
        <Card title="Compose message" subtitle="Use {{name}}, {{company}}, {{product}}, {{city}} and {{sender_name}} as variables">
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="label">Subject</label>
            <input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label className="label">Message body</label>
            <textarea className="textarea" style={{ minHeight: 260 }} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>

          <div className="divider" />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 4 }}>Product presentation (PDF)</div>
              {attachment ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileText size={15} color="#4f46e5" />
                  <a href={attachment.url} target="_blank" rel="noreferrer" className="cell-email">{attachment.filename}</a>
                  <button className="icon-btn danger" title="Remove" onClick={deletePresentation}><Trash2 size={14} /></button>
                </div>
              ) : (
                <span className="hint">No presentation uploaded yet.</span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label className="label" style={{ margin: 0 }}>Attach to email</label>
              <label className="switch">
                <input type="checkbox" checked={includeAttachment} onChange={(e) => setIncludeAttachment(e.target.checked)} />
                <span className="slider" />
              </label>
              <input ref={fileRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={(e) => uploadPresentation(e.target.files?.[0])} />
              <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}><Upload size={13} /> Upload PDF</button>
            </div>
          </div>
        </Card>

        <Card title="Select recipients" subtitle={`${candidates.length} buyers with usable email addresses`}>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={15} style={{ position: 'absolute', left: 11, top: 10, color: '#94a3b8' }} />
            <input className="input" style={{ paddingLeft: 33 }} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search buyers…" />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <button className="btn btn-soft btn-sm" onClick={() => setSelected(new Set(candidates.map((l) => l.id)))}>Select all ({candidates.length})</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
          <div style={{ maxHeight: 420, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 10 }}>
            {candidates.length ? candidates.map((l) => (
              <label key={l.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 12px',
                borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                background: selected.has(l.id) ? 'var(--primary-soft)' : 'transparent',
              }}>
                <input type="checkbox" className="checkbox" style={{ marginTop: 2 }} checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="cell-main" style={{ fontSize: 12 }}>{l.company}</div>
                  <div className="cell-sub" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.email}</div>
                </div>
                <EmailBadge status={l.emailStatus} />
              </label>
            )) : <Empty text="No buyers with usable emails. Validate and classify your leads first." />}
          </div>
        </Card>
      </div>

      {sendResult && (
        <Card title="Last send result" subtitle={`Mode: ${sendResult.mode}`} style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <Badge tone="green">{sendResult.results.filter((r) => r.status === 'sent').length} sent</Badge>
            <Badge tone="amber">{sendResult.results.filter((r) => r.status === 'demo-sent').length} demo</Badge>
            <Badge tone="red">{sendResult.results.filter((r) => r.status === 'failed').length} failed</Badge>
            <Badge tone="gray">{sendResult.results.filter((r) => r.status === 'skipped').length} skipped</Badge>
          </div>
          <div className="table-wrap">
            <table className="table" style={{ minWidth: 520 }}>
              <thead><tr><th>Email</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {sendResult.results.map((r, i) => (
                  <tr key={`${r.leadId}_${i}`}>
                    <td className="cell-email">{r.email || '—'}</td>
                    <td><Badge tone={r.status === 'sent' ? 'green' : r.status === 'demo-sent' ? 'amber' : r.status === 'failed' ? 'red' : 'gray'}>{r.status}</Badge></td>
                    <td className="hint">{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Card title="Email history" subtitle="Every outreach attempt is stored for tracking and duplicate prevention">
        {history.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Buyer</th><th>Email</th><th>Subject</th><th>Attachment</th><th>Status</th><th>Sent</th></tr></thead>
              <tbody>
                {history.slice(0, 25).map((h) => (
                  <tr key={h.id}>
                    <td><div className="cell-main">{h.company}</div><div className="cell-sub">{h.name}</div></td>
                    <td className="cell-email">{h.email}</td>
                    <td style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.subject}</td>
                    <td>{h.attachment ? <><Paperclip size={12} style={{ verticalAlign: -2 }} /> {h.attachment}</> : '—'}</td>
                    <td><Badge tone={h.status === 'sent' ? 'green' : h.status === 'demo-sent' ? 'amber' : 'red'}>{h.status}</Badge></td>
                    <td>{fmtDateTime(h.sentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon={Mail} text="No emails sent yet. Select recipients above and hit Send." />}
      </Card>
    </>
  );
}
