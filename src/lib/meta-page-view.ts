import { META_PIXEL_ID, isMarketingPage, readConsentCookie, safeMarketingReferrer, type CookieConsent } from './cookie-consent';
import { isCatalogLandingPath } from './meta-catalog';

// Fixed names only: never derive an event label from an order ID, a title,
// form fields, query parameters or fragments. Staff/admin/API routes are excluded.
export function metaPageType(url: URL): string | null {
  const pages: Record<string, string> = {
    '/': 'home', '/menu': 'menu', '/servizi': 'servizi',
    '/allergeni': 'allergeni', '/privacy': 'privacy', '/cookie-policy': 'cookie',
    '/accedi': 'accesso', '/registrati': 'registrazione', '/ordine': 'checkout',
    '/account/orders': 'area-personale', '/acquisto-completato': 'conferma',
  };
  if (Object.hasOwn(pages, url.pathname)) return pages[url.pathname];
  if (isCatalogLandingPath(url.pathname)) return 'prodotto';
  if (/^\/stato-ordine\/[^/]+$/.test(url.pathname)) return 'stato-prenotazione';
  if (/^\/feedback\/[^/]+$/.test(url.pathname)) return 'valutazione';
  return null;
}

export function permitsMetaPageView(consent: CookieConsent | null, url: URL): boolean {
  return consent?.adult === true && consent.marketing === true && metaPageType(url) !== null;
}

export function needsSafeMetaPageView(consent: CookieConsent | null, url: URL, referrer: string): boolean {
  if (!permitsMetaPageView(consent, url)) return false;
  return !isMarketingPage(url) || !safeMarketingReferrer(referrer, url.origin);
}

export function safeMetaPageViewUrl(consent: CookieConsent | null, url: URL, cookie: string): string | null {
  if (!permitsMetaPageView(consent, url)) return null;
  const type = metaPageType(url)!;
  const event = new URL('https://www.facebook.com/tr');
  event.searchParams.set('id', META_PIXEL_ID);
  event.searchParams.set('ev', 'PageView');
  event.searchParams.set('noscript', '1');
  event.searchParams.set('dl', new URL('/visita/' + type, url.origin).href);
  event.searchParams.set('rl', '');
  // Use existing, consented Meta identifiers only. No contact matching, CRM ID,
  // local order token, note, free-text campaign or freshly invented browser ID.
  for (const [name, parameter, pattern] of [
    ['_fbp', 'fbp', /^fb\.[12]\.\d{13}\.\d{5,30}$/],
    ['_fbc', 'fbc', /^fb\.[12]\.\d{13}\.[A-Za-z0-9_-]{20,512}$/],
  ] as const) {
    const value = cookie.split(';').map(v => v.trim()).find(v => v.startsWith(name + '='))?.slice(name.length + 1);
    if (value && pattern.test(value)) event.searchParams.set(parameter, value);
  }
  return event.href;
}

export function sendSafeMetaPageView(): HTMLImageElement | null {
  const url = new URL(location.href), consent = readConsentCookie(document.cookie);
  if (!needsSafeMetaPageView(consent, url, document.referrer)) return null;
  const target = safeMetaPageViewUrl(consent, url, document.cookie);
  if (!target) return null;
  const pixel = new Image(1, 1);
  // Browser-enforced protection: the private page URL is never an HTTP Referer.
  pixel.referrerPolicy = 'no-referrer';
  pixel.alt = '';
  pixel.hidden = true;
  pixel.dataset.ltMetaPageView = 'safe';
  pixel.src = target;
  document.body.appendChild(pixel);
  return pixel;
}
