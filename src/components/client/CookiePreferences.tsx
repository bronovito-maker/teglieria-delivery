'use client';
import { applyAccountGrowthChoice, needsGrowthWithdrawalRetry } from '@/lib/account-growth-consent';
import { useEffect, useRef, useState } from 'react';
import { CONSENT_COOKIE, CONSENT_SECONDS, CONSENT_VERSION, type CookieConsent, isMarketingPage, permitsAnalytics, permitsMeta, readConsentCookie, safeMarketingReferrer } from '@/lib/cookie-consent';
import { permitsPurchase, type PurchasePublic } from '@/lib/meta-purchase-client';
import { startMeta, stopMeta } from '@/lib/meta-pixel';
import { startGA, stopGA, gaEvent, analyticsItem } from '@/lib/ga4';
import { safeAnalyticsReferrer } from '@/lib/analytics-attribution';
import { useCartStore } from '@/store/cart';

export default function CookiePreferences({ nonce, purchases = [] }: { nonce: string; purchases?: PurchasePublic[] }) {
  const [ready, setReady] = useState(false), [open, setOpen] = useState(false), [personalize, setPersonalize] = useState(false);
  const [hasChoice, setHasChoice] = useState(false);
  const [analytics,setAnalytics]=useState(false);
  const [profiling,setProfiling]=useState(false), [historyConsent,setHistoryConsent]=useState(false), [busy,setBusy]=useState(false);
  const [marketing, setMarketing] = useState(false), [adult, setAdult] = useState(false), [error, setError] = useState('');
  const stored = useRef<CookieConsent | null>(null);
  const consentOperation=useRef(false);
  const documentFenced = useRef(false);
  const channel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    stored.current = readConsentCookie(document.cookie);
    setProfiling(stored.current?.personalization??false);setHistoryConsent(stored.current?.history??false);setAnalytics(stored.current?.analytics??false); setHasChoice(Boolean(stored.current)); setOpen(!stored.current); setMarketing(stored.current?.marketing ?? false); setAdult(stored.current?.adult ?? false); setReady(true);
    let purchase: PurchasePublic | undefined;
    try { purchase = purchases.find(p => p.eventId === sessionStorage.getItem('lt_meta_active_purchase')); } catch {}
    const purchaseAllowed = permitsPurchase(stored.current, new URL(location.href), purchase);
    const gaPurchaseAllowed=permitsPurchase(stored.current,new URL(location.href),purchase,Date.now(),'ga4');
    if (documentFenced.current || (!permitsMeta(stored.current, new URL(location.href)) && !permitsAnalytics(stored.current,new URL(location.href)) && !purchaseAllowed && !gaPurchaseAllowed) || !(safeMarketingReferrer(document.referrer, location.origin) || ((permitsAnalytics(stored.current,new URL(location.href)) || gaPurchaseAllowed) && safeAnalyticsReferrer(document.referrer, location.origin)))) {
      documentFenced.current=true;
      const entryPath=location.pathname;
      stopMeta(stored.current?.marketing !== true);stopGA(stored.current?.analytics!==true);
      if(!stored.current?.adult||!(stored.current.marketing||stored.current.analytics))return;
      // Re-enter a public page in a fresh document. Never start an SDK inside
      // a document that previously displayed account/order/form data.
      const push=history.pushState,replace=history.replaceState;
      const enter=(target:URL)=>{stopMeta(false);stopGA(false);location.assign(target.href);};
      const wrapEntry=(original:History['pushState']):History['pushState']=>function(data,unused,url){
        if(url!=null){const target=new URL(String(url),location.href);if(target.origin===location.origin&&isMarketingPage(target)&&target.pathname!==entryPath){enter(target);return;}}
        original.call(history,data,unused,url);
      };
      const entryClick=(event:MouseEvent)=>{if(event.defaultPrevented||event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;const a=event.target instanceof Element?event.target.closest('a[href]'):null;if(!(a instanceof HTMLAnchorElement)||a.target==='_blank'||a.hasAttribute('download'))return;const target=new URL(a.href,location.href);if(target.origin===location.origin&&isMarketingPage(target)){event.preventDefault();event.stopPropagation();enter(target);}};
      const entryBack=()=>{if(isMarketingPage(new URL(location.href))){stopMeta(false);stopGA(false);location.reload();}};
      history.pushState=wrapEntry(push);history.replaceState=wrapEntry(replace);
      document.addEventListener('click',entryClick,true);window.addEventListener('popstate',entryBack,true);
      return()=>{history.pushState=push;history.replaceState=replace;document.removeEventListener('click',entryClick,true);window.removeEventListener('popstate',entryBack,true);};
    }
    // A full document boundary removes the SDK before entering any sensitive URL.
    // Install these guards BEFORE loading Meta, including programmatic navigation/back.
    const originalPush = history.pushState, originalReplace = history.replaceState;
    let lastPageViewUrl = location.href;
    const publicPageView = () => {
      if (lastPageViewUrl === location.href || !(permitsMeta(readConsentCookie(document.cookie), new URL(location.href))||permitsAnalytics(readConsentCookie(document.cookie),new URL(location.href)))) return;
      lastPageViewUrl = location.href;if(permitsMeta(readConsentCookie(document.cookie),new URL(location.href))) window.fbq?.('track', 'PageView');gaEvent('page_view');
    };
    const leave = (target: URL) => {if(target.origin===location.origin&&target.pathname==='/ordine'){const cart=useCartStore.getState().items;gaEvent('begin_checkout',cart.map(i=>analyticsItem(i,i.quantity,Math.round(i.totalPrice*100))).filter((i):i is NonNullable<typeof i>=>i!==null),Math.round(cart.reduce((v,i)=>v+i.totalPrice,0)*100));}stopMeta(false);stopGA(false);location.assign(target.href); };
    const wrap = (original: History['pushState']): History['pushState'] => function(data, unused, url) {
      if (url != null) {
        const target = new URL(String(url), location.href);
        if (target.origin !== location.origin || !isMarketingPage(target)) { leave(target); return; }
      }
      const previous = location.href;
      original.call(history, data, unused, url);
      if (previous !== location.href) publicPageView();
    };
    history.pushState = wrap(originalPush); history.replaceState = wrap(originalReplace);
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const target = new URL(anchor.href, location.href);
      if (target.origin !== location.origin || !isMarketingPage(target)) { event.preventDefault(); event.stopPropagation(); leave(target); }
    };
    const back = () => { if (!isMarketingPage(new URL(location.href))) { stopMeta(false);stopGA(false); location.reload(); } else publicPageView(); };
    document.addEventListener('click', click, true); window.addEventListener('popstate', back, true);
    if((permitsMeta(stored.current,new URL(location.href))||purchaseAllowed)&&safeMarketingReferrer(document.referrer,location.origin))startMeta(nonce, purchaseAllowed ? purchase : undefined);
    if(permitsAnalytics(stored.current,new URL(location.href))||gaPurchaseAllowed)startGA(nonce,gaPurchaseAllowed?purchase:undefined);
    return () => { stopMeta(false);stopGA(false); history.pushState = originalPush; history.replaceState = originalReplace; document.removeEventListener('click', click, true); window.removeEventListener('popstate', back, true); };
  }, [nonce, purchases]);
  useEffect(() => {
    let active=true;
    const show=()=>{const saved=readConsentCookie(document.cookie);setAnalytics(saved?.analytics??false);setMarketing(saved?.marketing??false);setProfiling(saved?.personalization??false);setHistoryConsent(saved?.history??false);setAdult(saved?.adult??false);setPersonalize(true);setOpen(true);setError('');};
    const checkAccount=()=>{void fetch('/api/auth/session',{cache:'no-store',credentials:'same-origin'}).then(r=>r.ok?r.json():null).then(data=>{
      const saved=readConsentCookie(document.cookie);
      if(active&&!consentOperation.current&&needsGrowthWithdrawalRetry(saved,data?.user?.id??'')){
        consentOperation.current=true;setBusy(true);
        void applyAccountGrowthChoice({personalization:false,history:false,adult:false}).then(result=>{
          if(!active||result.accountId!==saved!.profileAccountId)return;
          const current=readConsentCookie(document.cookie);if(current?.receiptId!==saved!.receiptId)return;
          const next={...current,growthWithdrawalPending:false};
          document.cookie=`${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=${Math.max(0,Math.floor((next.expiresAt-Date.now())/1000))}; SameSite=Lax${location.protocol==='https:'?'; Secure':''}`;
          stored.current=next;setError('');
        }).catch(()=>{if(active)setError('La scelta sul browser è salvata. La revoca della personalizzazione dell’account è ancora in attesa di connessione: riproveremo al prossimo accesso.');}).finally(()=>{consentOperation.current=false;if(active)setBusy(false);});
      }
      if(active&&data?.user?.id&&saved?.personalization&&saved.profileAccountId!==data.user.id){
        setAdult(false);setProfiling(false);setHistoryConsent(false);setOpen(true);setError('Per attivare la personalizzazione su questo account scegli di nuovo Accetta tutti oppure Personalizza. Non trasferiamo le scelte di altri account.');
      }
    }).catch(()=>{});};
    checkAccount();window.addEventListener('lt-auth-changed',checkAccount);window.addEventListener('online',checkAccount);window.addEventListener('lt-open-cookie-preferences',show);
    return()=>{active=false;window.removeEventListener('lt-auth-changed',checkAccount);window.removeEventListener('online',checkAccount);window.removeEventListener('lt-open-cookie-preferences',show);};
  },[]);
  useEffect(() => {
    const changed = () => {
      const next = readConsentCookie(document.cookie);
      if (next?.receiptId !== stored.current?.receiptId) { stopMeta();stopGA(); location.reload(); }
    };
    try { channel.current = new BroadcastChannel('lt-cookie-consent'); channel.current.onmessage = changed; } catch { /* Storage/focus fallback. */ }
    const storage = (event: StorageEvent) => { if (event.key === 'lt_cookie_consent_changed') changed(); };
    window.addEventListener('storage', storage); window.addEventListener('focus', changed); window.addEventListener('pageshow', changed);
    const timer = window.setInterval(changed, 60000);
    const expiry=stored.current?window.setTimeout(changed,Math.min(2147483647,Math.max(0,stored.current.expiresAt-Date.now()))):undefined;
    return () => { channel.current?.close(); window.clearInterval(timer);if(expiry!==undefined)window.clearTimeout(expiry); window.removeEventListener('storage', storage); window.removeEventListener('focus', changed); window.removeEventListener('pageshow', changed); };
  }, []);
  async function save(enabled: boolean, statistics: boolean=enabled, profile: boolean=enabled, history: boolean=profile, declaredAdult: boolean=adult) {
    if(busy||consentOperation.current)return;
    if ((enabled||statistics||profile) && !declaredAdult) { setError('Per attivare le funzioni facoltative dichiara di avere almeno 18 anni. Puoi sempre scegliere solo essenziali e ordinare.'); return; }
    const now = Date.now();
    const value: CookieConsent = { version: CONSENT_VERSION, receiptId: crypto.randomUUID(), recordedAt: now, expiresAt: now + CONSENT_SECONDS * 1000, analytics:statistics, marketing:enabled, adult:(enabled||statistics||profile)&&declaredAdult,personalization:profile,history:profile&&history,profileAccountId:!profile?stored.current?.profileAccountId:undefined,growthWithdrawalPending:!profile&&Boolean(stored.current?.profileAccountId&&(stored.current.personalization||stored.current.growthWithdrawalPending)) };
    const persist=()=>{document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${CONSENT_SECONDS}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;const saved=readConsentCookie(document.cookie);if(saved?.receiptId!==value.receiptId)return false;stored.current=saved;setHasChoice(true);return true;};
    consentOperation.current=true;setBusy(true);setError('');stopMeta();stopGA();
    // Reject/withdraw browser tracking immediately, even if the account service is unavailable.
    if(!enabled&&!statistics&&!profile&&!persist()){setError('Il browser non salva la scelta. Le funzioni facoltative restano disattivate.');consentOperation.current=false;setBusy(false);return;}
    try {
      const result=await applyAccountGrowthChoice({personalization:profile,history:profile&&history,adult:declaredAdult});
      if(result.accountId){value.profileAccountId=result.accountId;value.growthWithdrawalPending=false;}
      if(result.receiptId)value.growthReceiptId=result.receiptId;
      if(!persist())throw Error('Il browser non salva la scelta. Riprova dalle preferenze.');
      try { channel.current?.postMessage(value.receiptId);localStorage.setItem('lt_cookie_consent_changed',value.receiptId); } catch {}
      location.reload();
    } catch(error) {
      setError(error instanceof Error?error.message:'Salvataggio non confermato. Riprova.');consentOperation.current=false;setBusy(false);
    }
  }
  return <>
    <footer className="bg-white px-6 py-4 text-center text-xs text-charcoal">
      <a href="/cookie-policy" className="underline">Informazioni sui cookie</a>{' · '}
      <button type="button" className="underline" onClick={() => { const saved = readConsentCookie(document.cookie); setProfiling(saved?.personalization??false);setHistoryConsent(saved?.history??false);setAnalytics(saved?.analytics??false);setMarketing(saved?.marketing ?? false); setAdult(saved?.adult ?? false); setOpen(true); setPersonalize(true); setError(''); }}>Preferenze cookie</button>
    </footer>
    {ready && open && <section role="dialog" aria-modal="false" aria-labelledby="lt-cookie-title" className="fixed bottom-0 left-0 right-0 z-[60] max-h-[85dvh] overflow-y-auto border-t border-charcoal/20 bg-white p-5 shadow-2xl sm:p-6">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between gap-3"><h2 id="lt-cookie-title" className="font-display text-2xl">Cookie e preferenze</h2><button type="button" aria-label="Chiudi senza accettare" className="rounded-lg border px-3 py-1 text-xl" disabled={busy} onClick={() => hasChoice ? setOpen(false) : void save(false,false,false,false,false)}>×</button></div>
        <p className="mt-2 text-sm">I cookie tecnici servono a carrello, accesso e ordini. Con <strong>Accetta tutti</strong> dichiari di avere almeno 18 anni e attivi statistiche Google Analytics, misurazione pubblicitaria Meta e analisi interna dei tuoi acquisti collegati all’account, sul sito e al banco, compresi quelli precedenti degli ultimi 365 giorni, per conoscere gusti e preferenze.</p>
        <p className="mt-2 text-sm">Non attiviamo invii automatici di offerte. Con <strong>Personalizza</strong> puoi escludere singole finalità e lo storico; con <strong>Accetta solo essenziali</strong> puoi comunque ordinare. Il collegamento al profilo avviene automaticamente dopo una scelta fatta da un account autenticato; non attribuiamo vendite anonime.</p>
        <p className="mt-2 text-sm"><a className="underline" href="/cookie-policy">Cookie e fornitori</a>{' · '}<a className="underline" href="/privacy">Informativa privacy</a>. Ricordiamo la scelta per 12 mesi su questo browser; puoi cambiarla da «Preferenze cookie».</p>
        {personalize && <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} />Ho almeno 18 anni (necessario solo per le funzioni facoltative).</label>}
        {personalize && <fieldset className="mt-4 space-y-2 rounded-xl border p-3 text-sm"><legend className="px-1 font-bold">Personalizza</legend>
          <p>Cookie tecnici: sempre attivi, necessari al servizio.</p>
          <label className="flex items-start gap-2"><input type="checkbox" checked={marketing} onChange={e => setMarketing(e.target.checked)} />Pubblicità — Pixel Meta (visite, aggiunte al carrello, avvio checkout, scelta del pagamento, registrazioni completate e ordini: carta pagata oppure contanti accettati dal locale; prodotti, quantità, importo, valuta e identificativo pseudonimo; nessun contatto o dato della carta).</label>
          <label className="flex items-start gap-2"><input type="checkbox" checked={analytics} onChange={e=>setAnalytics(e.target.checked)} />Statistiche — Google Analytics 4 (pagine pubbliche, prodotti, carrello, avvio checkout e acquisti pagati; nessun contatto o dato della carta). Google Ads non è attivo.</label>
          <label className="flex items-start gap-2"><input type="checkbox" checked={profiling} onChange={e=>{setProfiling(e.target.checked);if(!e.target.checked)setHistoryConsent(false);}} />Preferenze acquisti — analisi interna degli acquisti collegati al tuo account, sul sito e al banco, senza invii promozionali.</label>
          <label className="flex items-start gap-2"><input type="checkbox" checked={historyConsent} disabled={!profiling} onChange={e=>setHistoryConsent(e.target.checked)} />Storico acquisti — includi anche gli acquisti precedenti collegati al tuo account degli ultimi 365 giorni.</label>
        </fieldset>}
        {busy && <p role="status" className="mt-3 text-sm">Salvataggio delle preferenze…</p>}
        {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
        <div className="sticky bottom-0 mt-4 flex flex-wrap gap-3 border-t border-charcoal/10 bg-white py-3">
          <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" disabled={busy} onClick={() => void save(true,true,true,true,true)}>Accetta tutti</button>
          <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" disabled={busy} onClick={() => void save(false,false,false,false,false)}>Accetta solo essenziali</button>
          <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" onClick={() => setPersonalize(true)}>Personalizza</button>
          {personalize && <button type="button" className="rounded-xl border border-charcoal px-4 py-3 text-sm font-bold" disabled={busy} onClick={() => void save(marketing,analytics,profiling,historyConsent)}>Salva preferenze</button>}
          {hasChoice && <button type="button" className="px-4 py-3 text-sm underline" onClick={() => setOpen(false)}>Chiudi senza modificare</button>}
        </div>
      </div>
    </section>}
  </>;
}
