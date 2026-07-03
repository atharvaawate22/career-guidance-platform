import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveMxMock, resolve4Mock } = vi.hoisted(() => ({
  resolveMxMock: vi.fn(),
  resolve4Mock: vi.fn(),
}));

vi.mock('dns/promises', () => ({
  default: { resolveMx: resolveMxMock, resolve4: resolve4Mock },
}));

import {
  suggestEmailDomain,
  isEmailDomainDeliverable,
} from '../src/utils/emailValidation';

describe('suggestEmailDomain', () => {
  it('suggests gmail.com for common TLD typos', () => {
    expect(suggestEmailDomain('user@gmail.con')).toBe('gmail.com');
    expect(suggestEmailDomain('user@gmail.cm')).toBe('gmail.com');
    expect(suggestEmailDomain('user@gmail.co')).toBe('gmail.com');
    expect(suggestEmailDomain('user@yahoo.con')).toBe('yahoo.com');
    expect(suggestEmailDomain('user@outlook.comm')).toBe('outlook.com');
  });

  it('suggests corrections for misspelled provider names', () => {
    expect(suggestEmailDomain('user@gmial.com')).toBe('gmail.com');
    expect(suggestEmailDomain('user@gamil.com')).toBe('gmail.com');
    expect(suggestEmailDomain('user@hotmial.com')).toBe('hotmail.com');
    // Both parts wrong at once
    expect(suggestEmailDomain('user@gmial.con')).toBe('gmail.com');
  });

  it('is case-insensitive on the domain', () => {
    expect(suggestEmailDomain('user@Gmail.CON')).toBe('gmail.com');
  });

  it('returns null for valid domains', () => {
    expect(suggestEmailDomain('user@gmail.com')).toBeNull();
    expect(suggestEmailDomain('user@yahoo.co.in')).toBeNull();
    expect(suggestEmailDomain('user@rediffmail.com')).toBeNull();
    // Unknown companies on ccTLDs must not be "corrected"
    expect(suggestEmailDomain('user@mycompany.co')).toBeNull();
    expect(suggestEmailDomain('user@college.ac.in')).toBeNull();
  });

  it('returns null for malformed input', () => {
    expect(suggestEmailDomain('not-an-email')).toBeNull();
    expect(suggestEmailDomain('user@nodot')).toBeNull();
  });
});

describe('isEmailDomainDeliverable', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns true when MX records exist', async () => {
    resolveMxMock.mockResolvedValueOnce([{ exchange: 'mx.example.com', priority: 10 }]);
    await expect(isEmailDomainDeliverable('a@real-domain-1.com')).resolves.toBe(true);
  });

  it('returns false when the domain does not exist at all', async () => {
    resolveMxMock.mockRejectedValueOnce(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }));
    resolve4Mock.mockRejectedValueOnce(Object.assign(new Error('nx'), { code: 'ENOTFOUND' }));
    await expect(isEmailDomainDeliverable('a@no-such-domain-2.con')).resolves.toBe(false);
  });

  it('falls back to A records when MX is missing', async () => {
    resolveMxMock.mockRejectedValueOnce(Object.assign(new Error('nd'), { code: 'ENODATA' }));
    resolve4Mock.mockResolvedValueOnce(['93.184.216.34']);
    await expect(isEmailDomainDeliverable('a@a-record-only-3.com')).resolves.toBe(true);
  });

  it('fails open on transient DNS errors', async () => {
    resolveMxMock.mockRejectedValueOnce(Object.assign(new Error('timeout'), { code: 'ETIMEOUT' }));
    await expect(isEmailDomainDeliverable('a@flaky-dns-4.com')).resolves.toBe(true);
  });

  it('caches lookups per domain', async () => {
    resolveMxMock.mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]);
    await isEmailDomainDeliverable('a@cached-domain-5.com');
    await isEmailDomainDeliverable('b@cached-domain-5.com');
    expect(resolveMxMock).toHaveBeenCalledTimes(1);
  });
});
