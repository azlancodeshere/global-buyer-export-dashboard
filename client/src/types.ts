export type Classification = 'business' | 'individual' | 'unclassified';
export type EmailStatus = 'valid' | 'invalid' | 'suspect' | 'unchecked';

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  source: string;
  product: string;
  city: string;
  state: string;
  country: string;
  classification: Classification;
  classificationConfidence: number | null;
  classificationReason: string;
  emailStatus: EmailStatus;
  emailCheckedAt: string | null;
  emailed: boolean;
  dateAdded: string;
}

export interface NameValue {
  name: string;
  value: number;
}

export interface Activity {
  id: string;
  type: string;
  message: string;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface EmailRecord {
  id: string;
  leadId: string;
  email: string;
  name: string;
  company: string;
  subject: string;
  status: 'sent' | 'demo-sent' | 'failed' | 'skipped';
  detail: string;
  attachment: string;
  mode: string;
  sentAt: string;
}

export interface PresentationMeta {
  filename: string;
  storedName: string;
  size: number;
  contentType: string;
  url: string;
  uploadedAt: string;
}

export interface Stats {
  totalLeads: number;
  validEmails: number;
  invalidEmails: number;
  suspectEmails: number;
  uncheckedEmails: number;
  businessBuyers: number;
  individualBuyers: number;
  unclassified: number;
  emailsSent: number;
  demoSent: number;
  duplicatesBlocked: number;
  bySource: NameValue[];
  byCity: NameValue[];
  byProduct: NameValue[];
  classification: NameValue[];
  emailHealth: NameValue[];
  outreachFunnel: NameValue[];
  recentLeads: Lead[];
  recentActivity: Activity[];
}

export interface Config {
  gemini: boolean;
  geminiModel: string;
  discovery: string;
  mail: string;
}

export type NotifyFn = (type: 'success' | 'error' | 'info', title: string, msg?: string) => void;

export interface SharedProps {
  notify: NotifyFn;
  refresh: () => Promise<void>;
  runBusy: <T>(message: string, fn: () => Promise<T>) => Promise<T>;
  goTo: (id: string, opts?: { leadIds?: string[] }) => void;
  config: Config | null;
  stats: Stats | null;
  leads: Lead[];
}
