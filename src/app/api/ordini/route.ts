import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
import { CONSENT_COOKIE, CONSENT_VERSION, parseConsent } from '@/lib/cookie-consent';
import { advertisingConsent, validOrderId, eventIdFor, intentName, signTicket, cookieOptions, INTENT_PREFIX, MAX_RECEIPTS } from '@/lib/meta-purchase-server';
import { ORDER_ATTRIBUTION_COOKIE, readOrderAttribution } from '@/lib/order-attribution';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const consent=parseConsent(request.cookies.get(CONSENT_COOKIE)?.value);
 const optedIn=request.headers.get('x-crm-attribution-consent')==='yes';
 const evidence=optedIn&&consent?.analytics&&consent.adult?await readOrderAttribution(request.cookies.get(ORDER_ATTRIBUTION_COOKIE)?.value,consent.receiptId):null;
 const upstream=await backendProxy(request,'api',evidence?JSON.stringify({...evidence,profile_opt_in:true,profile_opt_in_at:Date.now()}):undefined);
 if(!upstream.ok||!advertisingConsent(consent))return upstream;
 try{
  const order=await upstream.clone().json();if(!validOrderId(order.id))return upstream;
  const eventId=await eventIdFor(order.id),now=Date.now(),name=intentName(eventId);
  const token=await signTicket({kind:'intent',orderId:order.id,eventId,consentId:consent.receiptId,version:CONSENT_VERSION,issuedAt:now,expiresAt:now+9*86400000});
  const result=new NextResponse(upstream.body,{status:upstream.status,headers:upstream.headers});
  // Bounded first-party metadata; never touches authentication or order cookies.
  const old=request.cookies.getAll().filter(c=>c.name.startsWith(INTENT_PREFIX)&&c.name!==name);
  for(const c of old.slice(0,Math.max(0,old.length-MAX_RECEIPTS+1)))result.cookies.set(c.name,'',cookieOptions(request,0));
  result.cookies.set(name,token,cookieOptions(request,9*86400));return result;
 }catch{return upstream;} // Optional measurement must never break order creation.
}
export async function GET(request:NextRequest){return backendProxy(request,'api');}
