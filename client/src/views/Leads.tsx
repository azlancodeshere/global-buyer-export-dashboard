import { useMemo, useState } from 'react';
import {
  Search, ShieldCheck, Sparkles, Send, Trash2, Download, Mail, Phone,
  Globe2, MapPin, X, Filter, ChevronLeft, ChevronRight, UserRound,
} from 'lucide-react';
import { api } from '../api';
import { Card, PageHead, Empty, EmailBadge, ClassBadge, Badge, ConfidenceBar, StatCard, fmtDate } from '../components/ui';
import type { SharedProps, Lead } from '../types';

interface Props extends SharedProps {
  setPreselect: (ids: string[]) => void;
}

const PAGE_SIZE = 10;

function downloadCsv(leads: Lead[]) {
  const headers = ['Name', 'Company', 'Email', 'Phone', 'Website', 'Source', 'Product', 'City', 'State', 'Country', 'Classification', 'Email Status', 'Emailed'];
  const rows = leads.map((l) => [
    l.name, l.company, l.email, l.phone, l.website, l.source, l.product,
    l.city, l.state, l.country, l.classification, l.emailStatus, l.emailed ? 'yes' : 'no',
  ]);
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `buyers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Leads({ leads, notify, refresh, runBusy, goTo, setPreselect }: Props) {
  const [q, setQ] = useState('');
  const [source, setSource] = useState('all');
  const [classification, setClassification] = useState('all');
  const [emailStatus, setEmailStatus] = useState('all');
  const [emailed, setEmailed] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [detail, setDetail] = useState<Lead | null>(null);

  const sources = useMemo(() => [...new Set(leads.map((l) => l.source))].sort(), [leads]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase();
    return leads.filter((l) => {
      if (needle && ![l.name, l.company, l.email, l.phone, l.city, l.state].join(' ').toLowerCase().includes(needle)) return false;
      if (source !== 'all' && l.source !== source) return false;
      if (classification !== 'all') {
        if (classification === 'unclassified' ? l.classification !== 'unclassified' : l.classification !== classification) return false;
      }
      if (emailStatus !== 'all' && l.emailStatus !== emailStatus) return false;
      if (emailed === 'true' && !l.emailed) return false;
      if (emailed === 'false' && l.emailed) return false;
      return true;
    });
  }, [leads, q, source, classification, emailStatus, emailed]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((Math.min(currentPage, totalPages) - 1) * PAGE_SIZE, Math.min(currentPage, totalPages) * PAGE_SIZE);
  const selectedIds = [...selected];

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => {
    const ids = pageRows.map((l) => l.id);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const runValidation = async () => {
    try {
      const res = await runBusy('Validating email addresses (DNS + MX lookup)…', () =>
        api.post<{ checked: number; valid: number; invalid: number; suspect: number }>('/validation/run',
          selectedIds.length ? { ids: selectedIds } : {})
      );
      notify('success', 'Validation complete', `${res.valid} valid · ${res.suspect} suspect · ${res.invalid} invalid.`);
      await refresh();
    } catch (err) {
      notify('error', 'Validation failed', (err as Error).message);
    }
  };

  const runClassification = async () => {
    try {
      const res = await runBusy('Classifying buyers…', () =>
        api.post<{ engine: string; classified: number; business: number; individual: number }>('/classify/run',
          selectedIds.length ? { ids: selectedIds } : {})
      );
      notify('success', 'Classification complete', `${res.engine} · ${res.business} business · ${res.individual} individual.`);
      await refresh();
    } catch (err) {
      notify('error', 'Classification failed', (err as Error).message);
    }
  };

  const removeInvalid = async () => {
    const invalid = leads.filter((l) => l.emailStatus === 'invalid');
    if (!invalid.length) return notify('info', 'Nothing to remove', 'No invalid emails found.');
    try {
      await runBusy(`Removing ${invalid.length} invalid buyers…`, async () => {
        for (const l of invalid) await api.delete(`/leads/${l.id}`);
      });
      notify('success', 'Cleanup complete', `${invalid.length} invalid buyers removed.`);
      setSelected(new Set());
      await refresh();
    } catch (err) {
      notify('error', 'Cleanup failed', (err as Error).message);
    }
  };

  const removeOne = async (lead: Lead) => {
    try {
      await runBusy('Removing buyer…', () => api.delete(`/leads/${lead.id}`));
      setDetail(null);
      notify('success', 'Buyer removed', lead.company);
      await refresh();
    } catch (err) {
      notify('error', 'Could not remove buyer', (err as Error).message);
    }
  };

  return (
    <>
      <PageHead title="Buyers / Leads" subtitle={`${leads.length} buyers in your database. Select rows to run validation, AI classification or outreach.`}>
        <button className="btn btn-ghost" onClick={() => downloadCsv(filtered)}><Download size={14} /> Export CSV</button>
        <button className="btn btn-primary" onClick={() => goTo('discovery')}>Find more buyers</button>
      </PageHead>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <StatCard label="Showing" value={filtered.length} icon={Filter} tone="indigo" foot={`of ${leads.length} total buyers`} />
        <StatCard label="Selected" value={selected.size} icon={UserRound} tone="violet" foot="Ready for bulk actions" />
        <StatCard label="Valid emails" value={filtered.filter((l) => l.emailStatus === 'valid').length} icon={Mail} tone="green" foot="Deliverable contacts" />
        <StatCard label="Not contacted" value={filtered.filter((l) => !l.emailed).length} icon={Send} tone="blue" foot="Available for outreach" />
      </div>

      <Card title="Buyer database" subtitle="Search, filter and manage your leads">
        <div className="form-row" style={{ marginBottom: 14 }}>
          <div className="field" style={{ flex: 2, minWidth: 200 }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 11, top: 10, color: '#94a3b8' }} />
              <input className="input" style={{ paddingLeft: 33 }} value={q} onChange={(e) => { setQ(e.target.value); setCurrentPage(1); }} placeholder="Search name, company, email, city…" />
            </div>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <select className="select" value={source} onChange={(e) => { setSource(e.target.value); setCurrentPage(1); }}>
              <option value="all">All sources</option>
              {sources.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <select className="select" value={classification} onChange={(e) => { setClassification(e.target.value); setCurrentPage(1); }}>
              <option value="all">All types</option>
              <option value="business">Business</option>
              <option value="individual">Individual</option>
              <option value="unclassified">Unclassified</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <select className="select" value={emailStatus} onChange={(e) => { setEmailStatus(e.target.value); setCurrentPage(1); }}>
              <option value="all">All email states</option>
              <option value="valid">Valid</option>
              <option value="suspect">Suspect</option>
              <option value="invalid">Invalid</option>
              <option value="unchecked">Unchecked</option>
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <select className="select" value={emailed} onChange={(e) => { setEmailed(e.target.value); setCurrentPage(1); }}>
              <option value="all">All outreach</option>
              <option value="false">Not contacted</option>
              <option value="true">Contacted</option>
            </select>
          </div>
        </div>

        <div className="form-row" style={{ marginBottom: 14, padding: '10px 12px', background: '#f8fafc', borderRadius: 10 }}>
          <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600, marginRight: 4 }}>Bulk actions:</span>
          <button className="btn btn-ghost btn-sm" onClick={runValidation}><ShieldCheck size={13} /> Validate emails</button>
          <button className="btn btn-ghost btn-sm" onClick={runClassification}><Sparkles size={13} /> AI classify</button>
          <button className="btn btn-ghost btn-sm" onClick={() => {
            const ids = selectedIds.length ? selectedIds : filtered.filter((l) => l.emailStatus === 'valid').map((l) => l.id);
            if (!ids.length) return notify('info', 'No recipients', 'Validate emails first or select buyers.');
            goTo('outreach', { leadIds: ids });
          }}><Send size={13} /> Send email</button>
          <button className="btn btn-danger btn-sm" onClick={removeInvalid}><Trash2 size={13} /> Remove invalid</button>
          {selected.size > 0 && <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear selection</button>}
        </div>

        {pageRows.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 34 }}><input type="checkbox" className="checkbox" checked={pageRows.length > 0 && pageRows.every((l) => selected.has(l.id))} onChange={toggleAll} /></th>
                  <th>Buyer</th>
                  <th>Contact</th>
                  <th>Location</th>
                  <th>Source</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th style={{ width: 50 }} />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => (
                  <tr key={l.id} className={selected.has(l.id) ? 'selected-row' : ''}>
                    <td><input type="checkbox" className="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                    <td onClick={() => setDetail(l)} style={{ cursor: 'pointer' }}>
                      <div className="cell-main">{l.company}</div>
                      <div className="cell-sub">{l.name}</div>
                    </td>
                    <td>
                      <div className="cell-email">{l.email || '—'}</div>
                      <div className="cell-sub">{l.phone || 'No phone'}</div>
                    </td>
                    <td><div>{l.city || '—'}{l.state ? `, ${l.state}` : ''}</div><div className="cell-sub">{l.country}</div></td>
                    <td><Badge tone="gray">{l.source}</Badge></td>
                    <td><ClassBadge value={l.classification} /></td>
                    <td><EmailBadge status={l.emailStatus} /></td>
                    <td>{l.emailed ? <Badge tone="blue" dot>Contacted</Badge> : <Badge tone="gray">Not contacted</Badge>}</td>
                    <td>
                      <div className="actions-cell">
                        <button className="icon-btn" title="Send email" onClick={() => goTo('outreach', { leadIds: [l.id] })}><Send size={14} /></button>
                        <button className="icon-btn danger" title="Delete" onClick={() => removeOne(l)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty icon={Search} title="No buyers match your filters" text="Try clearing a filter or run a new discovery search." />}

        <div className="pagination">
          <span>Showing {filtered.length ? (Math.min(currentPage, totalPages) - 1) * PAGE_SIZE + 1 : 0}–{Math.min(Math.min(currentPage, totalPages) * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
          <div className="page-btns">
            <button className="btn btn-ghost btn-sm" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft size={14} /></button>
            <span style={{ padding: '6px 10px', fontSize: 12 }}>Page {Math.min(currentPage, totalPages)} / {totalPages}</span>
            <button className="btn btn-ghost btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight size={14} /></button>
          </div>
        </div>
      </Card>

      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{detail.company}</h3>
              <button className="icon-btn" onClick={() => setDetail(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                <ClassBadge value={detail.classification} />
                <EmailBadge status={detail.emailStatus} />
                {detail.emailed && <Badge tone="blue" dot>Contacted</Badge>}
              </div>
              <dl className="kv">
                <dt>Contact</dt><dd>{detail.name}</dd>
                <dt>Email</dt><dd>{detail.email || '—'}</dd>
                <dt>Phone</dt><dd>{detail.phone || '—'}</dd>
                <dt>Website</dt><dd>{detail.website || '—'}</dd>
                <dt>Location</dt><dd>{detail.city}, {detail.state}, {detail.country}</dd>
                <dt>Source</dt><dd>{detail.source}</dd>
                <dt>Product</dt><dd>{detail.product}</dd>
                <dt>Added</dt><dd>{fmtDate(detail.dateAdded)}</dd>
              </dl>
              {detail.classificationReason && (
                <>
                  <div className="divider" />
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>AI classification</div>
                  <ConfidenceBar value={detail.classificationConfidence} />
                  <p className="hint" style={{ marginTop: 8 }}>{detail.classificationReason}</p>
                </>
              )}
            </div>
            <div className="modal-foot">
              <button className="btn btn-danger" onClick={() => removeOne(detail)}><Trash2 size={14} /> Remove</button>
              <button className="btn btn-primary" onClick={() => { const id = detail.id; setDetail(null); goTo('outreach', { leadIds: [id] }); }}><Send size={14} /> Send email</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
