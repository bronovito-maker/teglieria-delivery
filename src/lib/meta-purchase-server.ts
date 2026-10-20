// Server-only callers: layout, proxy and route handlers. Never import into client code.
import { CONSENT_VERSION, type CookieConsent } from './cookie-consent';
export const INTENT_PREFIX='lt_mp_i_';
export const RECEIPT_PREFIX='lt_mp_r_';
export const MAX_RECEIPTS=5;
import type { PurchasePublic } from './meta-purchase-client';
export {metaPurchaseCents} from './meta-purchase-eligibility';
export type Ticket={kind:'intent'|'receipt';orderId:string;eventId:string;consentId:string;version:string;issuedAt:number;expiresAt:number;cents?:number;currency?:'EUR';metaEligible?:boolean;analyticsEligible?:boolean};
const enc=new TextEncoder();
function base64url(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unbase64url(value:string){return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function key(){const raw=process.env.UNIFIED_WEB_GATEWAY_KEY;if(!raw||raw.length<32)throw new Error('Missing signing key');return crypto.subtle.importKey('raw',enc.encode(raw),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export function validOrderId(id:unknown):id is string{return typeof id==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);}
export function validEventId(id:unknown):id is string{return typeof id==='string'&&/^ltp_[a-f0-9]{64}$/.test(id);}
export async function eventIdFor(id:string){if(!validOrderId(id))throw new Error('Invalid order');const signed=await crypto.subtle.sign('HMAC',await key(),enc.encode('lt-meta-purchase-event-v1:'+id));return 'ltp_'+Array.from(new Uint8Array(signed),b=>b.toString(16).padStart(2,'0')).join('');}
export function intentName(eventId:string){return INTENT_PREFIX+eventId.slice(4,28);}
export function receiptName(eventId:string){return RECEIPT_PREFIX+eventId.slice(4,28);}
export async function signTicket(ticket:Ticket){const body=base64url(enc.encode(JSON.stringify(ticket)));const sig=await crypto.subtle.sign('HMAC',await key(),enc.encode('lt-meta-ticket-v1:'+body));return body+'.'+base64url(new Uint8Array(sig));}
export async function readTicket(raw:string|undefined,kind:Ticket['kind'],now=Date.now()):Promise<Ticket|null>{
 try{
  if(!raw||raw.length>1600)return null;const parts=raw.split('.');if(parts.length!==2)return null;
  if(!await crypto.subtle.verify('HMAC',await key(),unbase64url(parts[1]),enc.encode('lt-meta-ticket-v1:'+parts[0])))return null;
  const t=JSON.parse(new TextDecoder().decode(unbase64url(parts[0]))) as Ticket;
  if(t.kind!==kind||t.version!==CONSENT_VERSION||!validOrderId(t.orderId)||!validEventId(t.eventId)||!/^[-a-f0-9]{36}$/.test(t.consentId)||!Number.isSafeInteger(t.issuedAt)||!Number.isSafeInteger(t.expiresAt)||t.issuedAt>now+60000||t.expiresAt<=now||t.expiresAt<=t.issuedAt||t.expiresAt-t.issuedAt>(kind==='receipt'?600000:9*86400000))return null;
  if(kind==='receipt'&&(!Number.isSafeInteger(t.cents)||t.cents!<=0||t.cents!>100000000||t.currency!=='EUR'))return null;
  if((t.metaEligible!==undefined&&typeof t.metaEligible!=='boolean')||(t.analyticsEligible!==undefined&&typeof t.analyticsEligible!=='boolean'))return null;
  if(t.eventId!==await eventIdFor(t.orderId))return null;
  return t;
 }catch{return null;}
}
export function confirmedPurchase(order:unknown,orderId:string):number|null{
 if(!order||typeof order!=='object')return null;const v=order as Record<string,unknown>;
 if(v.id!==orderId||v.paymentStatus!=='PAID'||!['CONFIRMED','PREPARING','READY','OUT','DELIVERED'].includes(String(v.status))||v.acceptanceReview===true||v.paymentReviewRequired===true||v.requiresCapacityDecision===true||(v.automaticRefundStatus!=null&&v.automaticRefundStatus!=='NONE')||Number(v.refundedAmountCents??0)!==0)return null;
 const total=v.total;if(typeof total!=='number'&&(typeof total!=='string'||!/^\d{1,7}(\.\d{1,2})?$/.test(total)))return null;
 const number=Number(total),cents=Math.round(number*100);return Number.isFinite(number)&&Number.isSafeInteger(cents)&&cents>0&&cents<=100000000&&Math.abs(number*100-cents)<0.000001?cents:null;
}
export function advertisingConsent(c:CookieConsent|null):c is CookieConsent{return c?.adult===true&&(c.marketing===true||c.analytics===true);}
export function purchasePublic(t:Ticket):PurchasePublic{return {eventId:t.eventId,cents:t.cents!,currency:'EUR',consentId:t.consentId,expiresAt:t.expiresAt,metaEligible:t.metaEligible!==false,analyticsEligible:t.analyticsEligible!==false};}
export async function publicReceipts(cookies:Array<{name:string;value:string}>,consent:CookieConsent|null){
 if(!advertisingConsent(consent))return [];
 const out:PurchasePublic[]=[];for(const c of cookies.filter(c=>c.name.startsWith(RECEIPT_PREFIX)).slice(0,MAX_RECEIPTS)){const t=await readTicket(c.value,'receipt');if(t&&c.name===receiptName(t.eventId)&&t.consentId===consent.receiptId)out.push(purchasePublic(t));}return out;
}
export function sameOrigin(request:Request){const u=new URL(request.url);let expected=u.origin;if(!process.env.VERCEL&&process.env.UNIFIED_WEB_ORIGIN){try{expected=new URL(process.env.UNIFIED_WEB_ORIGIN).origin;}catch{return false;}}const origin=request.headers.get('origin');return origin?origin===expected:request.headers.get('sec-fetch-site')!=='cross-site';}
export function cookieOptions(request:Request,maxAge:number){return {httpOnly:true,secure:new URL(process.env.UNIFIED_WEB_ORIGIN||request.url).protocol==='https:',sameSite:'lax' as const,path:'/',maxAge};}
