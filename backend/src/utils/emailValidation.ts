import dns from 'dns/promises';
import logger from './logger';

// Common misspellings of major email providers' second-level domain names.
const SLD_TYPOS: Record<string, string> = {
  gmial: 'gmail',
  gamil: 'gmail',
  gmali: 'gmail',
  gnail: 'gmail',
  gmaill: 'gmail',
  gmai: 'gmail',
  gemail: 'gmail',
  yaho: 'yahoo',
  yahooo: 'yahoo',
  yhoo: 'yahoo',
  hotmial: 'hotmail',
  hotmal: 'hotmail',
  hotmil: 'hotmail',
  outlok: 'outlook',
  outloook: 'outlook',
  iclod: 'icloud',
  icloude: 'icloud',
  rediffmial: 'rediffmail',
  rediffmal: 'rediffmail',
};

// Common typos of ".com" — only corrected when the provider name is recognized,
// so legitimate ccTLD domains (e.g. a real .co company address) are not touched.
const COM_TLD_TYPOS = new Set(['con', 'cm', 'om', 'co', 'comm', 'cim', 'vom', 'xom', 'cpm', 'ocm', 'cmo']);

const KNOWN_COM_PROVIDERS = new Set([
  'gmail', 'yahoo', 'outlook', 'hotmail', 'icloud',
  'rediffmail', 'live', 'protonmail', 'aol', 'zoho',
]);

/**
 * Returns the corrected domain (e.g. "gmail.com") if the email's domain looks
 * like a common typo of a major provider, or null if it looks fine.
 */
export function suggestEmailDomain(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at === -1) return null;
  const domain = email.slice(at + 1).toLowerCase();
  const parts = domain.split('.');
  if (parts.length < 2) return null;

  let sld = parts[0];
  let tld = parts.slice(1).join('.');

  if (SLD_TYPOS[sld]) sld = SLD_TYPOS[sld];

  if (KNOWN_COM_PROVIDERS.has(sld) && COM_TLD_TYPOS.has(tld)) tld = 'com';

  const suggested = `${sld}.${tld}`;
  return suggested !== domain ? suggested : null;
}

// Cache MX results so repeated bookings (or retries) don't re-hit DNS.
const MX_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const mxCache = new Map<string, { deliverable: boolean; expires: number }>();

/**
 * Checks whether the email's domain can receive mail (has MX or A records).
 * Fails OPEN: only returns false when DNS definitively says the domain does
 * not exist (ENOTFOUND/ENODATA). Timeouts and transient DNS errors return
 * true so a flaky resolver never blocks a legitimate booking.
 */
export async function isEmailDomainDeliverable(email: string): Promise<boolean> {
  const at = email.lastIndexOf('@');
  if (at === -1) return false;
  const domain = email.slice(at + 1).toLowerCase();

  const cached = mxCache.get(domain);
  if (cached && cached.expires > Date.now()) return cached.deliverable;

  let deliverable = true;
  try {
    const records = await dns.resolveMx(domain);
    deliverable = records.length > 0;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ENOTFOUND' || code === 'ENODATA') {
      // No MX records — some domains receive mail via an A record fallback.
      try {
        await dns.resolve4(domain);
        deliverable = true;
      } catch (aError) {
        const aCode = (aError as NodeJS.ErrnoException).code;
        deliverable = !(aCode === 'ENOTFOUND' || aCode === 'ENODATA');
      }
    } else {
      logger.warn(`MX lookup failed for ${domain} (${code}) — allowing booking`);
      deliverable = true;
    }
  }

  mxCache.set(domain, { deliverable, expires: Date.now() + MX_CACHE_TTL_MS });
  if (mxCache.size > 1000) {
    const oldest = mxCache.keys().next().value;
    if (oldest) mxCache.delete(oldest);
  }
  return deliverable;
}
