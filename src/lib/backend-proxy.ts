import { NextRequest } from 'next/server';
export async function backendProxy(request: NextRequest, prefix: 'api'|'media') {
 const endpoint=process.env.UNIFIED_BACKEND_URL;
 if (!endpoint) return Response.json({error:'Collegamento gestionale non configurato'},{status:503});
 const incoming=new URL(request.url);
 if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
  const origin=request.headers.get('origin');
  // Local Next receives loopback Host behind HTTPS; use the explicitly configured
  // public origin, never client-controlled forwarding headers. Vercel uses its request URL.
  let expectedOrigin=incoming.origin;
  if(!process.env.VERCEL && process.env.UNIFIED_WEB_ORIGIN) {
   try {expectedOrigin=new URL(process.env.UNIFIED_WEB_ORIGIN).origin;} catch {return Response.json({error:'Origine sito non configurata'},{status:503});}
  }
  if ((origin && origin!==expectedOrigin) || (!origin && request.headers.get('sec-fetch-site')==='cross-site')) {
   return Response.json({error:'Origine non consentita'},{status:403});
  }
 }
 const target=new URL('/web'+incoming.pathname+incoming.search,endpoint);
 if (!incoming.pathname.startsWith('/'+prefix+'/')) return new Response(null,{status:404});
 const headers=new Headers();
 for (const name of ['content-type','cookie','origin','sec-fetch-site','idempotency-key','x-order-status-token','stripe-signature','accept']) {
  const value=request.headers.get(name);if(value)headers.set(name,value);
 }
 // Vercel supplies its own forwarding metadata; the local HTTPS proxy overwrites x-real-ip.
 headers.set('x-real-ip',(process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for') : request.headers.get('x-real-ip'))??'unknown');
 if(process.env.UNIFIED_WEB_GATEWAY_KEY)headers.set('x-unified-gateway',process.env.UNIFIED_WEB_GATEWAY_KEY);
 const declared=Number(request.headers.get('content-length')??0);
 const limit=incoming.pathname==='/api/storage/upload'?8*1024*1024:512*1024;
 if(declared>limit)return Response.json({error:'Richiesta troppo grande'},{status:413});
 try {
  const body=['GET','HEAD'].includes(request.method)?undefined:await readLimitedBody(request.body,limit);
  if(body===null)return Response.json({error:'Richiesta troppo grande'},{status:413});
  const result=await fetch(target,{method:request.method,headers,body,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(45000)});
  const out=new Headers();
  for(const name of ['content-type','location','cache-control','etag','content-disposition']) {const value=result.headers.get(name);if(value)out.set(name,value);}
  for(const cookie of result.headers.getSetCookie())out.append('set-cookie',cookie);
  if(prefix==='api')out.set('cache-control','private, no-store');
  return new Response(result.body,{status:result.status,headers:out});
 } catch {return Response.json({error:'Gestionale temporaneamente non raggiungibile. Verifica lo stato dell’ordine prima di riprovare.'},{status:503});}
}

// Bound streaming/chunked requests before buffering; Content-Length is untrusted.
export async function readLimitedBody(stream:ReadableStream<Uint8Array>|null,limit:number):Promise<ArrayBuffer|null> {
 if(!stream)return new ArrayBuffer(0);
 const reader=stream.getReader();const chunks:Uint8Array[]=[];let size=0;let timedOut=false;
 const timer=setTimeout(()=>{timedOut=true;void reader.cancel().catch(()=>{});},15000);
 try {
  while(true){const {done,value}=await reader.read();if(timedOut)throw new Error('Request body timeout');if(done)break;
   size+=value.byteLength;if(size>limit){await reader.cancel();return null;}chunks.push(value);
  }
  const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.byteLength;}return out.buffer;
 } finally {clearTimeout(timer);reader.releaseLock();}
}
