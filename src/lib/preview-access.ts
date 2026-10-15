import { createHash, scrypt, timingSafeEqual } from 'node:crypto';

type Record = { version: number; username: string; salt: string; hash: string };
let cachedRecord = '', cachedCredential: Buffer | null = null, inflight = 0;
const equal = (a: Buffer, b: Buffer) => a.length === b.length && timingSafeEqual(a, b);

// Vercel must explicitly choose private/public; missing preview settings fail closed.
export async function previewAccess(request: Request): Promise<Response | null> {
 const mode = process.env.UNIFIED_PREVIEW_MODE;
 if (mode === 'public' || (!process.env.VERCEL && !mode)) return null;
 const deny = (status: number, message: string, challenge = false) => new Response(message, {status, headers: {
  'Cache-Control':'private, no-store', 'X-Robots-Tag':'noindex, nofollow', 'X-Content-Type-Options':'nosniff',
  ...(challenge ? {'WWW-Authenticate':'Basic realm="La Teglieria - accesso riservato", charset="UTF-8"'} : {}),
 }});
 if (mode !== 'private') return deny(503, 'Anteprima non configurata');
 let rec: Record; const raw = process.env.UNIFIED_PREVIEW_AUTH ?? '';
 try {
  rec = JSON.parse(raw);
  if (rec.version !== 1 || !/^[A-Za-z0-9_.-]{1,64}$/.test(rec.username) || !/^[a-f0-9]{32}$/.test(rec.salt) || !/^[a-f0-9]{128}$/.test(rec.hash)) throw Error();
 } catch { return deny(503, 'Accesso riservato non configurato'); }
 // Only Stripe's exact signed callback is exempt, after validating gate configuration.
 const url = new URL(request.url);
 if (request.method === 'POST' && url.pathname === '/api/stripe/webhook' && !url.search) return null;
 const auth = request.headers.get('authorization') ?? '';
 if (auth.length > 2048 || !/^Basic [A-Za-z0-9+/]+=*$/i.test(auth)) return deny(401,'Accesso riservato',true);
 if (raw !== cachedRecord) { cachedRecord=raw; cachedCredential=null; }
 const digest=createHash('sha256').update(auth).digest();
 if(cachedCredential && equal(digest,cachedCredential)) return null;
 const decoded=Buffer.from(auth.slice(6),'base64').toString('utf8');const colon=decoded.indexOf(':');
 if(colon<0 || decoded.slice(0,colon)!==rec.username) return deny(401,'Accesso riservato',true);
 const password=decoded.slice(colon+1);
 if(password.length<12 || password.length>256 || /[\r\n\0]/.test(password)) return deny(401,'Accesso riservato',true);
 if(inflight>=2) return deny(429,'Riprova tra poco');
 inflight++;
 try {
  const derived=await new Promise<Buffer>((resolve,reject)=>scrypt(password,Buffer.from(rec.salt,'hex'),64,{N:16384,r:8,p:1,maxmem:64*1024*1024},(error,key)=>error?reject(error):resolve(key)));
  if(!equal(derived,Buffer.from(rec.hash,'hex')))return deny(401,'Accesso riservato',true);
  if(raw===cachedRecord)cachedCredential=digest;
  return null;
 } catch {return deny(503,'Accesso riservato temporaneamente non disponibile');} finally {inflight--;}
}
