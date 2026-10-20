import {CONSENT_VERSION,type CookieConsent} from './cookie-consent';
export const REGISTRATION_COOKIE='lt_meta_registration_v1';
export type RegistrationReceipt={eventId:string;consentId:string;issuedAt:number;expiresAt:number;version:string};
const enc=new TextEncoder();
function b64(v:Uint8Array){return btoa(String.fromCharCode(...v)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function bytes(v:string){return Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
async function key(){const secret=process.env.UNIFIED_WEB_GATEWAY_KEY;if(!secret||secret.length<32)throw Error('REGISTRATION_SIGNING_UNAVAILABLE');return crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export async function registrationTicket(eventId:string,consent:CookieConsent,now=Date.now()){
 if(!/^ltr_[a-f0-9]{64}$/.test(eventId)||!consent.marketing||!consent.adult)throw Error('REGISTRATION_EVENT_INVALID');
 const data=b64(enc.encode(JSON.stringify({eventId,consentId:consent.receiptId,issuedAt:now,expiresAt:now+600000,version:CONSENT_VERSION})));
 return data+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',await key(),enc.encode('lt-registration-receipt-v1:'+data))));
}
export async function readRegistration(raw:string|undefined,consent:CookieConsent|null,now=Date.now()):Promise<RegistrationReceipt|null>{
 try{if(!raw||raw.length>1000||!consent?.marketing||!consent.adult)return null;const [data,signature,...extra]=raw.split('.');if(!signature||extra.length||!await crypto.subtle.verify('HMAC',await key(),bytes(signature),enc.encode('lt-registration-receipt-v1:'+data)))return null;
 const p=JSON.parse(new TextDecoder().decode(bytes(data)));if(p.version!==CONSENT_VERSION||!/^ltr_[a-f0-9]{64}$/.test(p.eventId)||p.consentId!==consent.receiptId||!Number.isSafeInteger(p.issuedAt)||!Number.isSafeInteger(p.expiresAt)||p.issuedAt>now+60000||p.expiresAt<=now||p.expiresAt-p.issuedAt!==600000)return null;return p;
 }catch{return null;}
}
