import { describe, expect, it } from 'vitest';
import { CONSENT_SECONDS, CONSENT_VERSION, parseConsent, permitsMeta, safeMarketingReferrer, type CookieConsent } from './cookie-consent';
const now = Date.now();
const accepted: CookieConsent = { version: CONSENT_VERSION, receiptId: '00000000-0000-4000-8000-000000000001', recordedAt: now, expiresAt: now + CONSENT_SECONDS * 1000, analytics: false, marketing: true, adult: true };
const raw = (v: unknown) => encodeURIComponent(JSON.stringify(v));
describe('optional advertising consent', () => {
  it('accepts current adult consent and remembers explicit refusal', () => {
    expect(parseConsent(raw(accepted), now)).toEqual(accepted);
    expect(parseConsent(raw({ ...accepted, marketing: false, adult: false }), now)?.marketing).toBe(false);
  });
  it.each([undefined, '', '%invalid', raw({ ...accepted, version: 'old' }), raw({ ...accepted, adult: false }), raw({ ...accepted, marketing: 'true' }), raw({ ...accepted, recordedAt: now + 120000 }), raw({ ...accepted, expiresAt: now }), raw({ ...accepted, receiptId: 'invalid' })])('fails closed for invalid/missing/expired consent: %s', value => {
    expect(parseConsent(value, now)).toBeNull();
  });
  it.each(['/ordine', '/account/orders', '/accedi', '/registrati', '/stato-ordine/secret', '/admin', '/rider', '/menu?email=private', '/menu#token=secret', '/api/config'])('never permits Meta on %s', path => {
    expect(permitsMeta(accepted, new URL('https://example.invalid' + path))).toBe(false);
  });
  it('permits only consented public pages', () => {
    for (const path of ['/', '/menu', '/servizi']) {
      const url = new URL('https://example.invalid' + path);
      expect(permitsMeta(accepted, url)).toBe(true);
      expect(permitsMeta({ ...accepted, marketing: false }, url)).toBe(false);
      expect(permitsMeta(null, url)).toBe(false);
    }
  });
  it('does not leak a sensitive previous URL through the SDK referrer', () => {
    const origin = 'https://example.invalid';
    expect(safeMarketingReferrer('', origin)).toBe(true);
    expect(safeMarketingReferrer(origin + '/menu', origin)).toBe(true);
    expect(safeMarketingReferrer(origin + '/stato-ordine/private', origin)).toBe(false);
    expect(safeMarketingReferrer(origin + '/menu?token=private', origin)).toBe(false);
    expect(safeMarketingReferrer('https://external.invalid/path?email=private', origin)).toBe(false);
  });
});
