import { readConsentCookie, type CookieConsent, safeMarketingReferrer } from './cookie-consent';
export type PurchasePublic={eventId:string;cents:number;currency:'EUR';consentId:string;expiresAt:number;metaEligible?:boolean;analyticsEligible?:boolean};
export const PURCHASE_LEDGER='lt_meta_purchases_v1';
export function permitsPurchase(consent:CookieConsent|null,url:URL,p:PurchasePublic|undefined,now=Date.now(),provider:'meta'|'ga4'='meta'):p is PurchasePublic{
 return Boolean((provider==='meta'?consent?.marketing:consent?.analytics)&&(provider==='meta'?p?.metaEligible!==false:p?.analyticsEligible!==false)&&consent?.adult&&p&&p.consentId===consent.receiptId&&p.expiresAt>now&&/^ltp_[a-f0-9]{64}$/.test(p.eventId)&&Number.isSafeInteger(p.cents)&&p.cents>0&&p.cents<=100000000&&p.currency==='EUR'&&url.pathname==='/acquisto-completato'&&!url.search&&!url.hash);
}
export function clearPurchaseStorage(){void clearMetaEvents();try{localStorage.removeItem(PURCHASE_LEDGER);sessionStorage.removeItem('lt_meta_active_purchase');sessionStorage.removeItem('lt_purchase_navigation_v1');}catch{}}
// Stable event IDs plus an atomic IndexedDB claim; Web Locks/localStorage fallback.
export {eventSeen} from './meta-event-ledger';
import {claimEvent,clearMetaEvents} from './meta-event-ledger';
export async function wasPurchaseClaimed(id:string,provider:'meta'|'ga4'='meta'){return eventSeen(provider+':purchase',id);}
import {eventSeen} from './meta-event-ledger';
export async function claimPurchase(p:PurchasePublic,provider:'meta'|'ga4'='meta'):Promise<boolean>{
 if(!permitsPurchase(readConsentCookie(document.cookie),new URL(location.href),p,Date.now(),provider)||!safeMarketingReferrer(document.referrer,location.origin))return false;
 const receipt=readConsentCookie(document.cookie)?.receiptId;
 const claim=await claimEvent(provider+':purchase',p.eventId);
 return claim&&readConsentCookie(document.cookie)?.receiptId===receipt&&permitsPurchase(readConsentCookie(document.cookie),new URL(location.href),p,Date.now(),provider);
}
// A blocked SDK must not bounce the customer between status/confirmation forever.
// Separate provider attempts let GA4 become eligible after a cash Meta commitment.
const ATTEMPTS='lt_purchase_navigation_v1';
type Attempt={id:string;meta:boolean;ga4:boolean;at:number};
function navigationAttempts():Attempt[]{const v=JSON.parse(sessionStorage.getItem(ATTEMPTS)||'[]');if(!Array.isArray(v))throw Error('Invalid attempts');return v.filter(a=>a&&typeof a.id==='string'&&typeof a.at==='number'&&a.at>Date.now()-600000).slice(-19);}
export function purchaseNavigationAttempted(id:string,provider:'meta'|'ga4'):boolean{try{return navigationAttempts().some(a=>a.id===id&&a[provider]===true);}catch{return true;}}
export function markPurchaseNavigation(id:string,meta:boolean,ga4:boolean):boolean{try{const rows=navigationAttempts(),old=rows.find(a=>a.id===id);if(old){old.meta||=meta;old.ga4||=ga4;old.at=Date.now();}else rows.push({id,meta,ga4,at:Date.now()});sessionStorage.setItem(ATTEMPTS,JSON.stringify(rows));return (!meta||purchaseNavigationAttempted(id,'meta'))&&(!ga4||purchaseNavigationAttempted(id,'ga4'));}catch{return false;}}
