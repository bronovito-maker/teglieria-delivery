import type { CartItem } from '@/types';
import { resolveMetaCatalogItem } from './meta-catalog';
import { permitsMeta,readConsentCookie,safeMarketingReferrer } from './cookie-consent';
export type MetaCartPayload={content_ids:string[];content_type:'product';value:number;currency:'EUR';contents:{id:string;quantity:number}[]};
export function addedCartPayload(item: Pick<CartItem,'productId'|'variant'>,quantity:number,cents:number):{payload:MetaCartPayload}|{reason:string} {
 if(!Number.isSafeInteger(quantity)||quantity<=0||!Number.isSafeInteger(cents)||cents<=0)return {reason:'INVALID_COMMITTED_DELTA'};
 const match=resolveMetaCatalogItem(item);if('reason' in match)return match;
 return {payload:{content_ids:[match.id],content_type:'product',value:cents/100,currency:'EUR',contents:[{id:match.id,quantity}]}};
}
// No persistent queue: hydration, failed additions and consent granted later never replay old cart changes.
const sent=new Set<string>();
export function trackCommittedCartAddition(intent:string,item:Pick<CartItem,'productId'|'variant'>,quantity:number,cents:number):void {
 if(typeof window==='undefined'||typeof document==='undefined'||sent.has(intent))return;
 const decision=addedCartPayload(item,quantity,cents);
 if('reason' in decision){console.info('Meta AddToCart omitted:',decision.reason);return;}
 const consent=readConsentCookie(document.cookie);
 const allowed=()=>permitsMeta(readConsentCookie(document.cookie),new URL(location.href))&&safeMarketingReferrer(document.referrer,location.origin);
 if(!consent||!allowed())return;
 const script=document.getElementById('lt-meta-pixel');if(!script||!window.fbq)return;
 // Remember the exact consent decision. A later grant cannot authorize an earlier addition.
 const receipt=consent.receiptId;
 const send=()=>{
  if(sent.has(intent)||!script.isConnected||readConsentCookie(document.cookie)?.receiptId!==receipt||!allowed()||!window.fbq?.callMethod)return;
  sent.add(intent);if(sent.size>256)sent.delete(sent.values().next().value!);
  try{window.fbq('track','AddToCart',decision.payload);}catch{/* Measurement failure never changes the cart. */}
 };
 if(window.fbq.callMethod)send();
 else script.addEventListener('load',send,{once:true});
}
