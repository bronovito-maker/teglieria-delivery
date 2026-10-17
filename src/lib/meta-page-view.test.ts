import { afterEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_SECONDS, CONSENT_VERSION, parseConsent, type CookieConsent } from './cookie-consent';
import { metaPageType, needsSafeMetaPageView, permitsMetaPageView, safeMetaPageViewUrl, sendSafeMetaPageView } from './meta-page-view';

const now = Date.now();
const yes: CookieConsent = { version: CONSENT_VERSION, receiptId: '00000000-0000-4000-8000-000000000001', recordedAt: now, expiresAt: now + CONSENT_SECONDS * 1000, analytics: false, marketing: true, adult: true };
const url = (path: string) => new URL(path, 'https://lateglieria.it');
afterEach(() => vi.unstubAllGlobals());

describe('all customer pages, consented minimal Meta PageView', () => {
  it.each([
    ['/', 'home'], ['/menu', 'menu'], ['/servizi', 'servizi'], ['/allergeni', 'allergeni'],
    ['/privacy', 'privacy'], ['/cookie-policy', 'cookie'], ['/accedi', 'accesso'],
    ['/registrati', 'registrazione'], ['/ordine', 'checkout'], ['/account/orders', 'area-personale'],
    ['/stato-ordine/PRIVATE_ORDER', 'stato-prenotazione'], ['/feedback/PRIVATE_FEEDBACK', 'valutazione'],
    ['/acquisto-completato', 'conferma'], ['/prodotto/cmtelvnpb0001qww7wsbrlqbj', 'prodotto'],
  ])('maps %s to a fixed page type', (path, type) => {
    expect(metaPageType(url(path))).toBe(type);
    expect(permitsMetaPageView(yes, url(path))).toBe(true);
  });
  it.each(['/admin/login', '/admin/ordini', '/api/ordini', '/rider', '/sandbox/payment/PRIVATE', '/offline', '/prodotto/PRIVATE_UNKNOWN', '/stato-ordine/a/b', '/unknown'])('excludes internal/unknown %s', path => {
    expect(metaPageType(url(path))).toBeNull();
    expect(safeMetaPageViewUrl(yes, url(path), '')).toBeNull();
  });
  it.each([null, { ...yes, marketing: false }, { ...yes, marketing: false, analytics: true }, { ...yes, adult: false }])('requires adult marketing consent, never analytics alone', consent => {
    expect(safeMetaPageViewUrl(consent, url('/ordine'), '')).toBeNull();
  });
  it('requires one renewed choice for the expanded page coverage', () => {
    expect(parseConsent(encodeURIComponent(JSON.stringify({ ...yes, version: '2026-10-16-ga4-meta-v4' })))).toBeNull();
  });
  it('does not duplicate SDK PageViews on clean public pages', () => {
    expect(needsSafeMetaPageView(yes, url('/menu'), '')).toBe(false);
    expect(needsSafeMetaPageView(yes, url('/'), '')).toBe(false);
    expect(needsSafeMetaPageView(yes, url('/ordine'), '')).toBe(true);
    expect(needsSafeMetaPageView(yes, url('/menu?email=PRIVATE_EMAIL'), '')).toBe(true);
    expect(needsSafeMetaPageView(yes, url('/menu#token=PRIVATE_TOKEN'), '')).toBe(true);
    expect(needsSafeMetaPageView(yes, url('/menu'), 'https://lateglieria.it/stato-ordine/PRIVATE_ORDER')).toBe(true);
  });
  it('cannot transmit an order token, original URL, query, fragment, referrer, form or CRM data', () => {
    const event = new URL(safeMetaPageViewUrl(yes, url('/stato-ordine/PRIVATE_ORDER?email=PRIVATE_EMAIL#token=PRIVATE_TOKEN'), 'lt_web_session=PRIVATE_AUTH; crm=PRIVATE_CRM; _fbp=PRIVATE_PHONE')!);
    expect([...event.searchParams.keys()].sort()).toEqual(['dl', 'ev', 'id', 'noscript', 'rl']);
    expect(event.searchParams.get('dl')).toBe('https://lateglieria.it/visita/stato-prenotazione');
    expect(event.searchParams.get('rl')).toBe('');
    expect(event.searchParams.get('ev')).toBe('PageView');
    expect(event.searchParams.get('id')).toBe('955909697258843');
    expect(event.href).not.toContain('PRIVATE');
  });
  it('reuses existing valid advertising identifiers without creating a new identity', () => {
    const fbp='fb.1.1792230000000.1234567890', fbc='fb.1.1792230000000.SYNTHETIC_CLICK_1234567890';
    const event=new URL(safeMetaPageViewUrl(yes,url('/ordine'),`_fbp=${fbp}; _fbc=${fbc}`)!);
    expect(event.searchParams.get('fbp')).toBe(fbp);
    expect(event.searchParams.get('fbc')).toBe(fbc);
  });
  it('uses an image with browser-enforced no-referrer and never loads provider JavaScript', () => {
    const pixel: Record<string, unknown>={dataset:{}},append=vi.fn();
    vi.stubGlobal('Image', function() {return pixel;});
    vi.stubGlobal('location',url('/ordine?token=PRIVATE'));
    vi.stubGlobal('document',{cookie:'lt_cookie_preferences='+encodeURIComponent(JSON.stringify(yes)),referrer:'https://lateglieria.it/stato-ordine/PRIVATE',body:{appendChild:append}});
    expect(sendSafeMetaPageView()).toBe(pixel);
    expect(pixel.referrerPolicy).toBe('no-referrer');
    expect(pixel.src).not.toContain('PRIVATE');
    expect(append).toHaveBeenCalledOnce();
  });
});
