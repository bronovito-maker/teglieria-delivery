import { readConsentCookie, type CookieConsent, safeMarketingReferrer } from './cookie-consent';
export type PurchasePublic={eventId:string;cents:number;currency:'EUR';consentId:string;expiresAt:number};
export const PURCHASE_LEDGER='lt_meta_purchases_v1';
export function permitsPurchase(consent:CookieConsent|null,url:URL,p:PurchasePublic|undefined,now=Date.now()):p is PurchasePublic{
 return Boolean(consent?.marketing&&consent.adult&&p&&p.consentId===consent.receiptId&&p.expiresAt>now&&/^ltp_[a-f0-9]{64}$/.test(p.eventId)&&Number.isSafeInteger(p.cents)&&p.cents>0&&p.cents<=100000000&&p.currency==='EUR'&&url.pathname==='/acquisto-completato'&&!url.search&&!url.hash);
}
export function clearPurchaseStorage(){try{localStorage.removeItem(PURCHASE_LEDGER);sessionStorage.removeItem('lt_meta_active_purchase');}catch{}}
// Record before sending: prefer undercounting on network failures over duplicate revenue.
export async function claimPurchase(p:PurchasePublic):Promise<boolean>{
 const claim=()=>{
  if(!permitsPurchase(readConsentCookie(document.cookie),new URL(location.href),p)||!safeMarketingReferrer(document.referrer,location.origin))return false;
  try{
   const now=Date.now(),raw=JSON.parse(localStorage.getItem(PURCHASE_LEDGER)||'[]');
   if(!Array.isArray(raw))return false;
   const rows=raw.filter(v=>v&&typeof v.id==='string'&&typeof v.at==='number'&&v.at>now-90*86400000).slice(-255);
   if(rows.some(v=>v.id===p.eventId))return false;
   rows.push({id:p.eventId,at:now});localStorage.setItem(PURCHASE_LEDGER,JSON.stringify(rows));
   return localStorage.getItem(PURCHASE_LEDGER)===JSON.stringify(rows);
  }catch{return false;}
 };
 // Web Locks serializes the shared ledger across tabs. Without it, fail closed.
 if(!navigator.locks)return false;
 return navigator.locks.request('lt-meta-purchase-ledger',claim);
}
