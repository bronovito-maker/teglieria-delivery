import { claimPurchase, clearPurchaseStorage, permitsPurchase, type PurchasePublic } from './meta-purchase-client';
import { readConsentCookie } from './cookie-consent';
import { META_PIXEL_ID } from './cookie-consent';
type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; push?: Fbq; loaded?: boolean; version?: string };
declare global { interface Window { fbq?: Fbq; _fbq?: Fbq; } }
export function removeMetaCookies() {
  const host = window.location.hostname;
  const parts = host.split('.');
  const domains = ['', ...parts.map((_, i) => parts.slice(i).join('.')).filter(d => d.includes('.')).flatMap(d => [d, '.' + d])];
  for (const name of ['_fbp', '_fbc']) for (const domain of domains) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domain ? '; Domain=' + domain : ''}${location.protocol === 'https:' ? '; Secure' : ''}`;
  }
}
export function stopMeta(clearCookies = true) {
  window.fbq?.('consent', 'revoke');
  document.getElementById('lt-meta-pixel')?.remove();
  if (clearCookies) { removeMetaCookies(); clearPurchaseStorage(); }
}
export function startMeta(nonce: string, purchase?: PurchasePublic) {
  if (document.getElementById('lt-meta-pixel')) return;
  const fbq: Fbq = Object.assign(function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args); else fbq.queue.push(args);
  }, { queue: [] as unknown[][], loaded: true, version: '2.0' });
  fbq.push = fbq;
  window.fbq = window._fbq = fbq;
  // No automatic form/button collection or advanced matching of customer data.
  fbq('set', 'autoConfig', false, META_PIXEL_ID);
  fbq('consent', 'grant');
  fbq('init', META_PIXEL_ID);
  if (!purchase) fbq('track', 'PageView');
  const script = document.createElement('script');
  script.id = 'lt-meta-pixel'; script.async = true; script.nonce = nonce;
  script.src = 'https://connect.facebook.net/en_US/fbevents.js';
  if (purchase) {
    const settled = () => window.dispatchEvent(new Event('lt:meta-purchase-settled'));
    script.onerror = settled;
    script.onload = () => { void (async () => {
      try {
        if (await claimPurchase(purchase) && permitsPurchase(readConsentCookie(document.cookie), new URL(location.href), purchase)) {
          fbq('trackSingle', META_PIXEL_ID, 'Purchase', { value: purchase.cents / 100, currency: purchase.currency }, { eventID: purchase.eventId });
        }
      } catch { /* Measurement failure never blocks the order. */ } finally { settled(); }
    })(); };
  }
  document.head.appendChild(script);
}
