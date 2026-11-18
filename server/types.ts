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
  [key: string]: unknown;
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

export type StoreKey = 'leads' | 'emails' | 'activity' | 'presentation';

export interface DiscoveryResult {
  leads: Lead[];
  meta: {
    engine: string;
    query: string;
    results: number;
    contactsFound: number;
    fallback: boolean;
  };
}
