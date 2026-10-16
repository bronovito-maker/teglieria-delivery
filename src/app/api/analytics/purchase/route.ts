import { NextRequest,NextResponse } from 'next/server';
import { backendProxy,readLimitedBody } from '@/lib/backend-proxy';
import { CONSENT_COOKIE,parseConsent } from '@/lib/cookie-consent';
import { confirmedPurchase,readTicket,receiptName,sameOrigin,validEventId } from '@/lib/meta-purchase-server';
import { purchaseItems,purchaseTotals } from '@/lib/ga4-commerce';
export const dynamic='force-dynamic',runtime='nodejs';
const answer=(status:number)=>new NextResponse(null,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
// Read-only, signed receipt and private order access are both required.
export async function POST(request:NextRequest){
 if(!sameOrigin(request))return answer(403);
 const consent=parseConsent(request.cookies.get(CONSENT_COOKIE)?.value);
 if(!consent?.analytics||!consent.adult)return answer(403);
 try{
  const raw=await readLimitedBody(request.body,1024);if(raw===null)return answer(413);
  const data=JSON.parse(new TextDecoder().decode(raw));if(!validEventId(data.eventId))return answer(400);
  const ticket=await readTicket(request.cookies.get(receiptName(data.eventId))?.value,'receipt');
  if(!ticket||ticket.eventId!==data.eventId||ticket.consentId!==consent.receiptId)return answer(404);
  const h=new Headers();for(const name of ['cookie','origin','sec-fetch-site']){const v=request.headers.get(name);if(v)h.set(name,v);}
  const upstream=await backendProxy(new NextRequest(new URL('/api/ordini/'+ticket.orderId,request.url),{headers:h}),'api');
  if(!upstream.ok)return answer(404);
  const order=await upstream.json();if(confirmedPurchase(order,ticket.orderId)!==ticket.cents)return answer(409);
  // Incomplete line data never invents items: keep a verified aggregate purchase.
  const details=purchaseItems(order),totals=purchaseTotals(order,ticket.cents!);if(!totals)return answer(409);
  return NextResponse.json({transaction_id:ticket.eventId,currency:'EUR',...totals,...(details??{})},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch{return answer(400);}
}
