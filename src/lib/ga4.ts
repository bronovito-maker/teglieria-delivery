import { catalogLabel } from './ga4-commerce';
import { readCampaign, ATTRIBUTION_COOKIE } from './analytics-attribution';
import { GA4_ID, permitsAnalytics, readConsentCookie, safeMarketingReferrer } from './cookie-consent';
import { claimPurchase, permitsPurchase, type PurchasePublic } from './meta-purchase-client';
import { catalogPolicy } from './meta-catalog';
import type { CartItem } from '@/types';
declare global { interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[])=>void; } }
let pageSequence=0;
const listViews=new Set<string>();
const denied={analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'};
export type AnalyticsItem={item_id:string;price?:number;quantity?:number};
export function analyticsItem(item:Pick<CartItem,'productId'|'variant'>,quantity?:number,cents?:number):AnalyticsItem|null {
 const p=catalogPolicy.find(p=>p.productId===item.productId&&(p.configurable||(p.variant??'')===(item.variant??'')));
 if(!p)return null;
 if(quantity!==undefined&&(!Number.isSafeInteger(quantity)||quantity<=0))return null;
 if(cents!==undefined&&(!Number.isSafeInteger(cents)||cents<0))return null;
 return {item_id:p.id,...(quantity!==undefined?{quantity}:{}),...(cents!==undefined&&quantity?{price:cents/100/quantity}:{})};
}
function allowed(){return permitsAnalytics(readConsentCookie(document.cookie),new URL(location.href))&&safeMarketingReferrer(document.referrer,location.origin);}
// Explicit event allowlist and projection: never forward objects supplied by forms/customer notes.
export function gaEvent(name:'page_view'|'view_item_list'|'view_item'|'select_item'|'add_to_cart'|'begin_checkout',items:AnalyticsItem[]=[],cents?:number){
 if(typeof window==='undefined'||!allowed()||!window.gtag||!document.getElementById('lt-ga4'))return;
 const safe=items.filter(i=>catalogPolicy.some(p=>p.id===i.item_id)).slice(0,200).map(i=>({item_id:i.item_id,...(catalogLabel(i.item_id)?{item_name:catalogLabel(i.item_id).name,item_category:catalogLabel(i.item_id).category}:{}),...(Number.isSafeInteger(i.quantity)&&i.quantity!>0?{quantity:i.quantity}:{}),...(Number.isFinite(i.price)&&i.price!>=0?{price:i.price}:{})}));
 if(['view_item','select_item','add_to_cart','view_item_list'].includes(name)&&!safe.length)return;
 const page=new URL(location.href);if(name==='page_view')pageSequence++;try{window.gtag('event',name,{send_to:GA4_ID,page_location:page.origin+page.pathname,page_referrer:'',page_title:page.pathname==='/menu'?'Menu La Teglieria':'La Teglieria',...(safe.length?{items:safe}:{}),...(Number.isSafeInteger(cents)&&cents!>0?{value:cents!/100,currency:'EUR'}:{})});}catch{/* Optional statistics must never break navigation or the cart. */}
}
export function stopGA(clear=true){
 if(typeof window==='undefined')return;
 (window as unknown as Record<string,unknown>)['ga-disable-'+GA4_ID]=true;
 try{window.gtag?.('consent','update',denied);}catch{}document.getElementById('lt-ga4')?.remove();
 if(clear){
  for(const c of document.cookie.split(';')){const name=c.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;const base=`${name}=; Path=/; Max-Age=0; SameSite=Lax`;document.cookie=base;const parts=location.hostname.split('.');for(let i=0;i<parts.length-1;i++){document.cookie=base+'; Domain='+parts.slice(i).join('.');document.cookie=base+'; Domain=.'+parts.slice(i).join('.');}}
  document.cookie=ATTRIBUTION_COOKIE+'=; Path=/; Max-Age=0; SameSite=Lax';
  try{localStorage.removeItem('lt_ga4_purchases_v1');}catch{}
 }
}
export function startGA(nonce:string,purchase?:PurchasePublic){
 if(typeof window==='undefined'||document.getElementById('lt-ga4'))return;
 const consent=readConsentCookie(document.cookie),url=new URL(location.href);
 if(!safeMarketingReferrer(document.referrer,location.origin)||(!permitsAnalytics(consent,url)&&!permitsPurchase(consent,url,purchase,Date.now(),'ga4')))return;
 (window as unknown as Record<string,unknown>)['ga-disable-'+GA4_ID]=false;
 window.dataLayer=[];window.gtag=function(){window.dataLayer!.push(arguments);};
 window.gtag('consent','default',denied);window.gtag('set','ads_data_redaction',true);window.gtag('set','url_passthrough',false);
 window.gtag('consent','update',{...denied,analytics_storage:'granted'});
 window.gtag('js',new Date());
 window.gtag('config',GA4_ID,{...readCampaign(document.cookie,consent!.receiptId),send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,ignore_referrer:true,page_location:url.origin+url.pathname,page_referrer:'',page_title:'La Teglieria',cookie_expires:90*86400,cookie_update:false});
 const script=document.createElement('script');script.id='lt-ga4';script.async=true;script.nonce=nonce;script.src='https://www.googletagmanager.com/gtag/js?id='+GA4_ID;
 const receipt=consent!.receiptId;
 if(purchase){script.onload=()=>{void(async()=>{try{const response=await fetch('/api/analytics/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({eventId:purchase.eventId}),signal:AbortSignal.timeout(2500)});if(!response.ok)return;const payload=await response.json();if(payload.transaction_id!==purchase.eventId||payload.currency!=='EUR'||typeof payload.value!=='number'||!Number.isFinite(payload.value)||payload.value<0)return;if(readConsentCookie(document.cookie)?.receiptId===receipt&&await claimPurchase(purchase,'ga4')&&permitsPurchase(readConsentCookie(document.cookie),new URL(location.href),purchase,Date.now(),'ga4'))window.gtag?.('event','purchase',{send_to:GA4_ID,transaction_id:purchase.eventId,value:payload.value,currency:purchase.currency,...(Array.isArray(payload.items)?{items:payload.items}:{}),...(typeof payload.shipping==='number'?{shipping:payload.shipping}:{}),page_location:location.origin+'/acquisto-completato',page_referrer:'',page_title:'Pagamento confermato'});}catch{/* Network/SDK failure cannot block access to the order. */}finally{window.dispatchEvent(new Event('lt:ga4-purchase-settled'));}})();};script.onerror=()=>window.dispatchEvent(new Event('lt:ga4-purchase-settled'));}
 document.head.appendChild(script);
 if(!purchase){gaEvent('page_view');window.dispatchEvent(new Event('lt:analytics-ready'));}
}
const cartIntents=new Set<string>();
export function trackAnalyticsCart(intent:string,item:Pick<CartItem,'productId'|'variant'>,quantity:number,cents:number){
 if(typeof window==='undefined'||cartIntents.has(intent)||!allowed())return;
 const safe=analyticsItem(item,quantity,cents);if(!safe)return;
 cartIntents.add(intent);if(cartIntents.size>256)cartIntents.delete(cartIntents.values().next().value!);
 gaEvent('add_to_cart',[safe],cents);
}

export function trackAnalyticsList(items:AnalyticsItem[]){
 if(typeof window==='undefined'||!allowed()||!window.gtag||!document.getElementById('lt-ga4')||!items.length)return;
 const key=pageSequence+':'+location.pathname+':'+items.map(i=>i.item_id).join('|');
 if(listViews.has(key))return;
 listViews.add(key);if(listViews.size>64)listViews.delete(listViews.values().next().value!);
 gaEvent('view_item_list',items);
}
