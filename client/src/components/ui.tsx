import type { CSSProperties, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { Classification, EmailStatus } from '../types';

export function PageHead({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  action,
  children,
  className = '',
  style,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`card ${className}`} style={style}>
      {(title || action) && (
        <div className="card-head">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

const TONES: Record<string, [string, string]> = {
  indigo: ['#4f46e5', '#eef2ff'],
  green: ['#10b981', '#ecfdf5'],
  amber: ['#f59e0b', '#fffbeb'],
  red: ['#ef4444', '#fef2f2'],
  blue: ['#0ea5e9', '#f0f9ff'],
  violet: ['#8b5cf6', '#f5f3ff'],
};

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'indigo',
  foot,
  onClick,
}: {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
  tone?: string;
  foot?: ReactNode;
  onClick?: () => void;
}) {
  const [color, soft] = TONES[tone] || TONES.indigo;
  return (
    <div className="card stat-card" style={{ cursor: onClick ? 'pointer' : undefined }} onClick={onClick}>
      <div className="stat-glow" style={{ background: color }} />
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div className="card-icon" style={{ background: soft, color }}>
            <Icon size={18} />
          </div>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  );
}

export function Badge({ children, tone = 'gray', dot = false }: { children: ReactNode; tone?: string; dot?: boolean }) {
  return (
    <span className={`badge badge-${tone}`}>
      {dot && <span className="dot" />}
      {children}
    </span>
  );
}

export function EmailBadge({ status }: { status: EmailStatus }) {
  const map: Record<EmailStatus, [string, string]> = {
    valid: ['green', 'Valid'],
    invalid: ['red', 'Invalid'],
    suspect: ['amber', 'Suspect'],
    unchecked: ['gray', 'Unchecked'],
  };
  const [tone, text] = map[status] || map.unchecked;
  return <Badge tone={tone} dot>{text}</Badge>;
}

export function ClassBadge({ value }: { value: Classification }) {
  if (value === 'business') return <Badge tone="violet">Business</Badge>;
  if (value === 'individual') return <Badge tone="blue">Individual</Badge>;
  return <Badge tone="gray">Unclassified</Badge>;
}

export function Empty({ icon: Icon, title = 'Nothing here yet', text }: { icon?: LucideIcon; title?: string; text?: string }) {
  return (
    <div className="empty">
      {Icon && (
        <div style={{
          width: 52, height: 52, borderRadius: 16, background: 'var(--line-soft)',
          display: 'grid', placeItems: 'center', marginBottom: 4,
          border: '1px solid var(--line)',
        }}>
          <Icon size={24} style={{ opacity: 0.4 }} />
        </div>
      )}
      {title && <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-soft)' }}>{title}</div>}
      {text && <p>{text}</p>}
    </div>
  );
}

export function Spinner({ dark = false }: { dark?: boolean }) {
  return <span className={`spinner ${dark ? 'dark' : ''}`} />;
}

export function LoadingButton({
  loading,
  children,
  onClick,
  className = 'btn btn-primary',
  disabled,
}: {
  loading?: boolean;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button className={className} onClick={onClick} disabled={loading || disabled}>
      {loading ? <Spinner /> : children}
    </button>
  );
}

export function ConfidenceBar({ value }: { value: number | null }) {
  const pct = Math.round((Number(value) || 0) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress confidence-bar">
        <span style={{ width: `${pct}%`, background: pct >= 85 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444' }} />
      </div>
      <span style={{ fontSize: 11, color: '#64748b' }}>{pct}%</span>
    </div>
  );
}

export function fmtDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
}

export function fmtDateTime(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return '—';
  }
}
