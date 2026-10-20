import {META_PIXEL_ID,readConsentCookie} from './cookie-consent';
import {permitsMetaPageView,metaPageType} from './meta-page-view';
import {claimEvent} from './meta-event-ledger';
export type MetaAction='InitiateCheckout'|'AddPaymentInfo'|'CompleteRegistration';
// The fixed enum and projection deliberately cannot forward a form/object to Meta.
async function sendActionImpl(name:MetaAction,eventId:string,cents?:number):Promise<boolean>{
 if(typeof document==='undefined'||!['InitiateCheckout','AddPaymentInfo','CompleteRegistration'].includes(name)||!/^lt[rm]_[a-f0-9_-]{20,90}$/.test(eventId))return false;
 const consent=readConsentCookie(document.cookie),url=new URL(location.href);
 if(!permitsMetaPageView(consent,url)||!consent)return false;
 if(cents!==undefined&&(!Number.isSafeInteger(cents)||cents<0||cents>100000000))return false;
 if(!await claimEvent('meta:'+name,eventId))return false;
 if(readConsentCookie(document.cookie)?.receiptId!==consent.receiptId||!permitsMetaPageView(readConsentCookie(document.cookie),new URL(location.href)))return false;
 const target=new URL('https://www.facebook.com/tr');target.searchParams.set('id',META_PIXEL_ID);target.searchParams.set('ev',name);target.searchParams.set('eid',eventId);target.searchParams.set('noscript','1');target.searchParams.set('dl',url.origin+'/visita/'+metaPageType(url));target.searchParams.set('rl','');
 if(cents!==undefined){target.searchParams.set('cd[value]',String(cents/100));target.searchParams.set('cd[currency]','EUR');}
 for(const [key,pattern] of [['_fbp',/^fb\.[12]\.\d{13}\.\d{5,30}$/],['_fbc',/^fb\.[12]\.\d{13}\.[A-Za-z0-9_-]{20,512}$/]] as const){const value=document.cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith(key+'='))?.slice(key.length+1);if(value&&pattern.test(value))target.searchParams.set(key.slice(1),value);}
 return new Promise(resolve=>{const image=new Image(1,1);image.referrerPolicy='no-referrer';image.hidden=true;image.alt='';image.dataset.ltMetaAction=name;const timer=setTimeout(()=>{image.remove();resolve(true);},800);const done=()=>{clearTimeout(timer);image.remove();resolve(true);};image.onload=done;image.onerror=done;image.src=target.href;document.body.appendChild(image);});
}
export async function sendMetaAction(name:MetaAction,eventId:string,cents?:number):Promise<boolean>{try{return await sendActionImpl(name,eventId,cents);}catch{return false;}}
function checkoutId():string|null {
 const consent=readConsentCookie(document.cookie);if(!consent?.marketing||!consent.adult)return null;
 try{const key='lt_meta_checkout_v1',old=JSON.parse(sessionStorage.getItem(key)||'null');if(old?.consentId===consent.receiptId&&typeof old.id==='string'&&/^ltm_[a-f0-9-]{36}$/.test(old.id)&&old.at>Date.now()-1800000)return old.id;
 const id='ltm_'+crypto.randomUUID();sessionStorage.setItem(key,JSON.stringify({id,consentId:consent.receiptId,at:Date.now()}));return id;}catch{return null;}
}
export function trackCheckout(cents:number){const id=checkoutId();if(id)void sendMetaAction('InitiateCheckout',id,cents);}
export async function trackPaymentChoice(cents:number){const id=checkoutId();if(id)await sendMetaAction('AddPaymentInfo',id,cents);}
export function finishMetaCheckout(){try{sessionStorage.removeItem('lt_meta_checkout_v1');}catch{}}
