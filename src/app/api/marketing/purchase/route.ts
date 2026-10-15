import { NextRequest, NextResponse } from 'next/server';
import { backendProxy, readLimitedBody } from '@/lib/backend-proxy';
import { CONSENT_COOKIE, CONSENT_VERSION, parseConsent } from '@/lib/cookie-consent';
import { advertisingConsent, validOrderId, eventIdFor, intentName, receiptName, readTicket, confirmedPurchase, signTicket, cookieOptions, sameOrigin, RECEIPT_PREFIX, MAX_RECEIPTS } from '@/lib/meta-purchase-server';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const answer=(status:number)=>new NextResponse(null,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return answer(403);
 const consent=parseConsent(request.cookies.get(CONSENT_COOKIE)?.value);
 if(!advertisingConsent(consent))return answer(403);
 try{
  const body=await readLimitedBody(request.body,2048);
  if(body===null)return answer(413);
  const data=JSON.parse(new TextDecoder().decode(body));
  if(!validOrderId(data.orderId))return answer(400);
  const eventId=await eventIdFor(data.orderId),name=intentName(eventId);
  const intent=await readTicket(request.cookies.get(name)?.value,'intent');
  if(!intent||intent.orderId!==data.orderId||intent.consentId!==consent.receiptId)return answer(404);
  // Authorize exactly as the private status page does. No client-supplied price/payment is trusted.
  const h=new Headers();for(const n of ['cookie','x-order-status-token','origin','sec-fetch-site']){const v=request.headers.get(n);if(v)h.set(n,v);}
  const upstream=await backendProxy(new NextRequest(new URL('/api/ordini/'+data.orderId,request.url),{method:'GET',headers:h}),'api');
  if(!upstream.ok)return answer(404);
  const cents=confirmedPurchase(await upstream.json(),data.orderId);if(cents===null)return answer(409);
  const now=Date.now(),token=await signTicket({kind:'receipt',orderId:data.orderId,eventId,consentId:consent.receiptId,version:CONSENT_VERSION,issuedAt:now,expiresAt:now+600000,cents,currency:'EUR'});
  const result=NextResponse.json({ready:true,eventId},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
  const old=request.cookies.getAll().filter(c=>c.name.startsWith(RECEIPT_PREFIX)&&c.name!==receiptName(eventId));
  for(const c of old.slice(0,Math.max(0,old.length-MAX_RECEIPTS+1)))result.cookies.set(c.name,'',cookieOptions(request,0));
  result.cookies.set(receiptName(eventId),token,cookieOptions(request,600));
  result.cookies.set(name,'',cookieOptions(request,0));return result;
 }catch{return answer(400);}
}
