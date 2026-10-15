export const CONSENT_COOKIE = 'lt_cookie_preferences';
export const CONSENT_VERSION = '2026-10-15-meta-purchase-955909697258843-v2';
export const CONSENT_SECONDS = 365 * 24 * 60 * 60;
export const META_PIXEL_ID = '955909697258843';
export type CookieConsent = {
  version: typeof CONSENT_VERSION;
  receiptId: string;
  recordedAt: number;
  expiresAt: number;
  marketing: boolean;
  adult: boolean;
};
export function parseConsent(raw: string | undefined, now = Date.now()): CookieConsent | null {
  try {
    const v = JSON.parse(decodeURIComponent(raw ?? ''));
    if (v.version !== CONSENT_VERSION || typeof v.receiptId !== 'string' || !/^[a-f0-9-]{36}$/.test(v.receiptId)
      || !Number.isFinite(v.recordedAt) || !Number.isFinite(v.expiresAt) || v.recordedAt > now + 60000
      || v.expiresAt <= now || v.expiresAt - v.recordedAt !== CONSENT_SECONDS * 1000
      || typeof v.marketing !== 'boolean' || typeof v.adult !== 'boolean' || (v.marketing && !v.adult)) return null;
    return v as CookieConsent;
  } catch { return null; }
}
export function readConsentCookie(cookie: string): CookieConsent | null {
  return parseConsent(cookie.split(';').map(s => s.trim()).find(s => s.startsWith(CONSENT_COOKIE + '='))?.slice(CONSENT_COOKIE.length + 1));
}
// Never expose checkout, accounts, order identifiers, query strings or fragments to Meta.
export function isMarketingPage(url: URL): boolean {
  return ['/', '/menu', '/servizi'].includes(url.pathname) && !url.search && !url.hash;
}
export function permitsMeta(consent: CookieConsent | null, url: URL): boolean {
  return consent?.marketing === true && consent.adult === true && isMarketingPage(url);
}

export function safeMarketingReferrer(referrer: string, origin: string): boolean {
  if (!referrer) return true;
  try {
    const url = new URL(referrer);
    return url.origin === origin ? isMarketingPage(url) : url.pathname === '/' && !url.search && !url.hash;
  } catch { return false; }
}
