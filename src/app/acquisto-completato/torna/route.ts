import { NextRequest, NextResponse } from 'next/server';
import { readTicket, receiptName, validEventId, sameOrigin } from '@/lib/meta-purchase-server';
export async function POST(request:NextRequest){
 // A native POST form under no-referrer may send Origin: null. Fetch Metadata
 // proves this browser navigation is same-origin; the signed cookie is still mandatory.
 if(!sameOrigin(request)&&!(request.headers.get('origin')==='null'&&request.headers.get('sec-fetch-site')==='same-origin'))return new NextResponse(null,{status:403});
 let id='';try{const raw=await request.text();if(raw.length>256)throw new Error();id=new URLSearchParams(raw).get('eventId')??'';}catch{}
 const ticket=validEventId(id)?await readTicket(request.cookies.get(receiptName(id))?.value,'receipt'):null;
 const result=NextResponse.redirect(new URL(ticket?'/stato-ordine/'+ticket.orderId:'/menu',process.env.UNIFIED_WEB_ORIGIN||request.url),303);
 result.headers.set('Cache-Control','private, no-store');result.headers.set('Referrer-Policy','no-referrer');
 // Keep the 10-minute receipt so a second tab can return to the same order.
 return result;
}
