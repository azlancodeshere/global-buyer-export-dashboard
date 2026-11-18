import dns from 'node:dns/promises';

export type ValidationStatus = 'valid' | 'invalid' | 'suspect';

export const FREE_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'yahoo.co.uk', 'hotmail.com', 'outlook.com', 'live.com',
  'aol.com', 'icloud.com', 'me.com', 'msn.com', 'proton.me', 'protonmail.com', 'gmx.com',
]);

const DISPOSABLE = new Set([
  'mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.com',
]);

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | '__timeout__'> {
  return Promise.race([
    promise,
    new Promise<'__timeout__'>((resolve) => setTimeout(() => resolve('__timeout__'), ms)),
  ]);
}

type MxResult = 'mx' | 'a-only' | 'none' | 'timeout';

async function mxLookup(domain: string): Promise<MxResult> {
  try {
    const result = await withTimeout(dns.resolveMx(domain), 3500);
    if (result === '__timeout__') return 'timeout';
    if (Array.isArray(result) && result.length) return 'mx';
    try {
      const a = await withTimeout(dns.resolve4(domain), 2500);
      return a === '__timeout__' || !Array.isArray(a) || !a.length ? 'none' : 'a-only';
    } catch {
      return 'none';
    }
  } catch {
    return 'none';
  }
}

export async function validateEmail(
  email: string
): Promise<{ status: ValidationStatus; reason: string }> {
  const value = String(email || '').trim().toLowerCase();
  if (!value) return { status: 'invalid', reason: 'Email is missing.' };
  if (!EMAIL_RE.test(value)) return { status: 'invalid', reason: 'Invalid email format.' };
  if (value.length > 254) return { status: 'invalid', reason: 'Email is too long.' };

  const [local, domain] = value.split('@');
  if (!local || local.length > 64) return { status: 'invalid', reason: 'Invalid local part.' };
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return { status: 'invalid', reason: 'Invalid domain.' };
  }
  if (DISPOSABLE.has(domain)) return { status: 'invalid', reason: 'Disposable email address.' };

  const mx = await mxLookup(domain);
  if (mx === 'mx') {
    return {
      status: 'valid',
      reason: FREE_PROVIDERS.has(domain)
        ? 'Domain has valid MX records (free provider).'
        : 'Domain has valid MX records.',
    };
  }
  if (mx === 'a-only') {
    return { status: 'suspect', reason: 'Domain has an A record but no MX record.' };
  }
  if (mx === 'timeout') {
    return { status: 'suspect', reason: 'DNS lookup timed out.' };
  }
  return { status: 'invalid', reason: 'Domain has no mail records.' };
}
