'use client';
import { useEffect, useRef, useState } from 'react';
import { CONSENT_COOKIE, CONSENT_SECONDS, CONSENT_VERSION, type CookieConsent, isMarketingPage, permitsMeta, readConsentCookie, safeMarketingReferrer } from '@/lib/cookie-consent';
import { permitsPurchase, type PurchasePublic } from '@/lib/meta-purchase-client';
import { startMeta, stopMeta } from '@/lib/meta-pixel';

export default function CookiePreferences({ nonce, purchases = [] }: { nonce: string; purchases?: PurchasePublic[] }) {
  const [ready, setReady] = useState(false), [open, setOpen] = useState(false), [personalize, setPersonalize] = useState(false);
  const [hasChoice, setHasChoice] = useState(false);
  const [marketing, setMarketing] = useState(false), [adult, setAdult] = useState(false), [error, setError] = useState('');
  const stored = useRef<CookieConsent | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    stored.current = readConsentCookie(document.cookie);
    setHasChoice(Boolean(stored.current)); setOpen(!stored.current); setMarketing(stored.current?.marketing ?? false); setAdult(stored.current?.adult ?? false); setReady(true);
    let purchase: PurchasePublic | undefined;
    try { purchase = purchases.find(p => p.eventId === sessionStorage.getItem('lt_meta_active_purchase')); } catch {}
    const purchaseAllowed = permitsPurchase(stored.current, new URL(location.href), purchase);
    if ((!permitsMeta(stored.current, new URL(location.href)) && !purchaseAllowed) || !safeMarketingReferrer(document.referrer, location.origin)) { stopMeta(stored.current?.marketing !== true); return; }
    // A full document boundary removes the SDK before entering any sensitive URL.
    // Install these guards BEFORE loading Meta, including programmatic navigation/back.
    const originalPush = history.pushState, originalReplace = history.replaceState;
    const leave = (target: URL) => { stopMeta(false); location.assign(target.href); };
    const wrap = (original: History['pushState']): History['pushState'] => function(data, unused, url) {
      if (url != null) {
        const target = new URL(String(url), location.href);
        if (target.origin !== location.origin || !isMarketingPage(target)) { leave(target); return; }
      }
      const previous = location.href;
      original.call(history, data, unused, url);
      if (previous !== location.href && isMarketingPage(new URL(location.href))) window.fbq?.('track', 'PageView');
    };
    history.pushState = wrap(originalPush); history.replaceState = wrap(originalReplace);
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const target = new URL(anchor.href, location.href);
      if (target.origin !== location.origin || !isMarketingPage(target)) { event.preventDefault(); event.stopPropagation(); leave(target); }
    };
    const back = () => { if (!isMarketingPage(new URL(location.href))) { stopMeta(false); location.reload(); } };
    document.addEventListener('click', click, true); window.addEventListener('popstate', back, true);
    startMeta(nonce, purchaseAllowed ? purchase : undefined);
    return () => { stopMeta(false); history.pushState = originalPush; history.replaceState = originalReplace; document.removeEventListener('click', click, true); window.removeEventListener('popstate', back, true); };
  }, [nonce, purchases]);
  useEffect(() => {
    const changed = () => {
      const next = readConsentCookie(document.cookie);
      if (next?.receiptId !== stored.current?.receiptId) { stopMeta(); location.reload(); }
    };
    try { channel.current = new BroadcastChannel('lt-cookie-consent'); channel.current.onmessage = changed; } catch { /* Storage/focus fallback. */ }
    const storage = (event: StorageEvent) => { if (event.key === 'lt_cookie_consent_changed') changed(); };
    window.addEventListener('storage', storage); window.addEventListener('focus', changed); window.addEventListener('pageshow', changed);
    const timer = window.setInterval(changed, 60000);
    return () => { channel.current?.close(); window.clearInterval(timer); window.removeEventListener('storage', storage); window.removeEventListener('focus', changed); window.removeEventListener('pageshow', changed); };
  }, []);
  function save(enabled: boolean) {
    if (enabled && !adult) { setError('Per attivare i cookie pubblicitari dichiara di avere almeno 18 anni. Puoi sempre rifiutarli e ordinare.'); return; }
    const now = Date.now();
    const value: CookieConsent = { version: CONSENT_VERSION, receiptId: crypto.randomUUID(), recordedAt: now, expiresAt: now + CONSENT_SECONDS * 1000, marketing: enabled, adult: enabled && adult };
    stopMeta();
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${CONSENT_SECONDS}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    const saved = readConsentCookie(document.cookie);
    if (saved?.receiptId !== value.receiptId) { setError('Il browser non salva la preferenza. I cookie pubblicitari restano disattivati.'); return; }
    try { channel.current?.postMessage(value.receiptId); localStorage.setItem('lt_cookie_consent_changed', value.receiptId); } catch { /* Consent itself remains in the cookie. */ }
    // New CSP and clean JS document also make revocation effective for an already loaded SDK.
    // The next HTML response expires optional HttpOnly tickets when consent is absent.
    location.reload();
  }
  return <>
    <footer className="bg-white px-6 py-4 text-center text-xs text-charcoal">
      <a href="/cookie-policy" className="underline">Informazioni sui cookie</a>{' · '}
      <button type="button" className="underline" onClick={() => { const saved = readConsentCookie(document.cookie); setMarketing(saved?.marketing ?? false); setAdult(saved?.adult ?? false); setOpen(true); setPersonalize(true); setError(''); }}>Preferenze cookie</button>
    </footer>
    {ready && open && <section role="dialog" aria-modal="false" aria-labelledby="lt-cookie-title" className="fixed bottom-0 left-0 right-0 z-[60] max-h-[85dvh] overflow-y-auto border-t border-charcoal/20 bg-white p-5 shadow-2xl sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-3"><h2 id="lt-cookie-title" className="font-display text-2xl">Scegli i tuoi cookie</h2><button type="button" aria-label="Chiudi senza accettare" className="rounded-lg border px-3 py-1 text-xl" onClick={() => hasChoice ? setOpen(false) : save(false)}>×</button></div>
        <p className="mt-2 text-sm">I cookie tecnici servono a carrello, accesso e ordini. Solo con il tuo consenso attiviamo il Pixel Meta per misurare visite e acquisti pagati dalle campagne Facebook e Instagram. Puoi rifiutare e ordinare normalmente.</p>
        <p className="mt-2 text-sm"><a className="underline" href="/cookie-policy">Cookie e fornitori</a>{' · '}<a className="underline" href="/privacy">Informativa privacy</a>. Ricordiamo la scelta per 12 mesi su questo browser; puoi cambiarla da «Preferenze cookie».</p>
        <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} />Ho almeno 18 anni (necessario solo per i cookie pubblicitari).</label>
        {personalize && <fieldset className="mt-4 space-y-2 rounded-xl border p-3 text-sm"><legend className="px-1 font-bold">Personalizza</legend>
          <p>Cookie tecnici: sempre attivi, necessari al servizio.</p>
          <label className="flex items-start gap-2"><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />Pubblicità — Pixel Meta (visite e acquisti pagati: importo, valuta e identificativo pseudonimo; nessun contatto o dato della carta).</label>
          <p>Google Analytics e altri tracciatori non sono installati.</p>
        </fieldset>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" onClick={() => save(true)}>Accetta tutti</button>
          <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" onClick={() => save(false)}>Accetta solo essenziali</button>
          <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" onClick={() => setPersonalize(true)}>Personalizza</button>
          {personalize && <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" onClick={() => save(marketing)}>Salva preferenze</button>}
          {hasChoice && <button type="button" className="px-4 py-3 text-sm underline" onClick={() => setOpen(false)}>Chiudi senza modificare</button>}
        </div>
      </div>
    </section>}
  </>;
}
