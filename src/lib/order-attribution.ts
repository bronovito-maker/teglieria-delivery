import { safeCampaign, type Campaign } from './analytics-attribution';

export const ORDER_ATTRIBUTION_COOKIE = 'lt_order_attribution';
export const ORDER_ATTRIBUTION_SECONDS = 1800;
export const ORDER_ATTRIBUTION_CONSENT_VERSION = 'crm-order-attribution-v1';
type Attribution = {source:'facebook'|'instagram'|'meta';medium:'paid_social';campaign_id?:string;ad_id?:string;captured_at:number;consent_receipt_id:string;consent_version:typeof ORDER_ATTRIBUTION_CONSENT_VERSION;evidence:'tagged_paid_social'};

function key(){const secret=process.env.UNIFIED_WEB_GATEWAY_KEY;return secret&&secret.length>=32?secret:null;}
function b64(bytes:Uint8Array){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
function unb64(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('invalid token');return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));}
async function signingKey(secret:string){return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
function validId(v:unknown){return typeof v==='string'&&/^\d{1,30}$/.test(v);}

export async function signOrderAttribution(campaign:Campaign,receiptId:string,at=Date.now()):Promise<string|null>{
 const secret=key();if(!secret||!['facebook','instagram','meta'].includes(campaign.campaign_source??'')||campaign.campaign_medium!=='paid_social'||!/^[a-f0-9-]{36}$/.test(receiptId))return null;
 const params=new URLSearchParams();params.set('utm_source',campaign.campaign_source!);params.set('utm_medium','paid_social');
 if(campaign.campaign_id)params.set('utm_id',campaign.campaign_id);
 if(campaign.campaign_content)params.set('utm_content',campaign.campaign_content);
 const safe=safeCampaign(params);
 const payload={source:safe.campaign_source,medium:'paid_social',...(safe.campaign_id?{campaign_id:safe.campaign_id}:{}),...(safe.campaign_content?{ad_id:safe.campaign_content}:{}),captured_at:at,consent_receipt_id:receiptId,consent_version:ORDER_ATTRIBUTION_CONSENT_VERSION,evidence:'tagged_paid_social'};
 const encoded=b64(new TextEncoder().encode(JSON.stringify(payload)));const signature=new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(secret),new TextEncoder().encode('crm-attribution-v1.'+encoded)));
 return encoded+'.'+b64(signature);
}

export async function readOrderAttribution(token:string|undefined,receiptId:string,now=Date.now()):Promise<Attribution|null>{
 const secret=key();if(!secret||!token||token.length>1024)return null;
 try{const [encoded,sig,extra]=token.split('.');if(extra||!encoded||!sig)return null;
  const okay=await crypto.subtle.verify('HMAC',await signingKey(secret),unb64(sig),new TextEncoder().encode('crm-attribution-v1.'+encoded));if(!okay)return null;
  const data=JSON.parse(new TextDecoder().decode(unb64(encoded)));
  if(!['facebook','instagram','meta'].includes(data.source)||data.medium!=='paid_social'||(data.campaign_id!==undefined&&!validId(data.campaign_id))||(data.ad_id!==undefined&&!validId(data.ad_id))||data.consent_receipt_id!==receiptId||data.consent_version!==ORDER_ATTRIBUTION_CONSENT_VERSION||data.evidence!=='tagged_paid_social'||!Number.isSafeInteger(data.captured_at)||data.captured_at>now||data.captured_at<now-ORDER_ATTRIBUTION_SECONDS*1000)return null;
  return data as Attribution;
 }catch{return null;}
}
