import {describe,it,expect,vi} from 'vitest';
import {readLimitedBody} from './backend-proxy';
describe('bounded proxy input',()=>{
 it('accepts exact limit across chunks',async()=>{const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(new Uint8Array([1,2]));c.enqueue(new Uint8Array([3,4]));c.close();}});expect(Array.from(new Uint8Array((await readLimitedBody(stream,4))!))).toEqual([1,2,3,4]);});
 it('cancels oversized chunked input without reading the remainder',async()=>{const cancel=vi.fn();let pulled=0;const stream=new ReadableStream<Uint8Array>({pull(c){pulled++;c.enqueue(new Uint8Array(1024));},cancel});expect(await readLimitedBody(stream,512)).toBeNull();expect(cancel).toHaveBeenCalledOnce();expect(pulled).toBeLessThanOrEqual(2);});
 it('accepts an absent body',async()=>expect((await readLimitedBody(null,4))!.byteLength).toBe(0));
});

import {NextRequest} from 'next/server';
import {backendProxy} from './backend-proxy';
import {afterEach} from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('split-host origin protection',()=>{
 it('rejects cross-origin writes before contacting the gateway',async()=>{vi.stubEnv('UNIFIED_BACKEND_URL','https://gateway.example');const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const r=await backendProxy(new NextRequest('https://lateglieria.it/api/ordini',{method:'POST',headers:{origin:'https://evil.invalid'},body:'{}'}),'api');expect(r.status).toBe(403);expect(fetcher).not.toHaveBeenCalled();});
 it('forwards only server gateway credentials and preserves backend cookies',async()=>{vi.stubEnv('UNIFIED_BACKEND_URL','https://gateway.example');vi.stubEnv('UNIFIED_WEB_GATEWAY_KEY','server-key');const fetcher=vi.fn().mockResolvedValue(new Response('{}',{headers:{'set-cookie':'lt_session=test; HttpOnly; Secure; SameSite=Lax'}}));vi.stubGlobal('fetch',fetcher);const r=await backendProxy(new NextRequest('https://lateglieria.it/api/auth/password',{method:'POST',headers:{origin:'https://lateglieria.it',authorization:'Basic secret',cookie:'lt_session=old'},body:'{}'}),'api');expect(r.status).toBe(200);expect(fetcher.mock.calls[0][0].toString()).toBe('https://gateway.example/web/api/auth/password');const h=fetcher.mock.calls[0][1].headers;expect(h.get('authorization')).toBeNull();expect(h.get('x-unified-gateway')).toBe('server-key');expect(h.get('cookie')).toBe('lt_session=old');expect(r.headers.get('set-cookie')).toContain('HttpOnly; Secure');});
});
describe('local HTTPS reverse proxy origin',()=>{
 it('accepts configured public origin when Next receives loopback Host',async()=>{
  vi.stubEnv('VERCEL','');vi.stubEnv('UNIFIED_WEB_ORIGIN','https://100.66.153.99:8443');vi.stubEnv('UNIFIED_BACKEND_URL','http://127.0.0.1:28800');
  const fetcher=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetcher);
  const r=await backendProxy(new NextRequest('http://127.0.0.1:4310/api/auth/password',{method:'POST',headers:{origin:'https://100.66.153.99:8443'},body:'{}'}),'api');expect(r.status).toBe(200);expect(fetcher).toHaveBeenCalledOnce();
 });
 it('rejects an attacker even when forwarding headers claim its own origin',async()=>{
  vi.stubEnv('VERCEL','');vi.stubEnv('UNIFIED_WEB_ORIGIN','https://lateglieria.it');vi.stubEnv('UNIFIED_BACKEND_URL','http://127.0.0.1:28800');
  const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
  const r=await backendProxy(new NextRequest('http://127.0.0.1:4310/api/ordini',{method:'POST',headers:{origin:'https://evil.invalid','x-forwarded-host':'evil.invalid','x-forwarded-proto':'https'},body:'{}'}),'api');expect(r.status).toBe(403);expect(fetcher).not.toHaveBeenCalled();
 });
 it('uses the preview request origin on Vercel even if canonical origin differs',async()=>{
  vi.stubEnv('VERCEL','1');vi.stubEnv('UNIFIED_WEB_ORIGIN','https://lateglieria.it');vi.stubEnv('UNIFIED_BACKEND_URL','https://gateway.example');
  const fetcher=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',fetcher);
  const r=await backendProxy(new NextRequest('https://test.vercel.app/api/auth/password',{method:'POST',headers:{origin:'https://test.vercel.app'},body:'{}'}),'api');expect(r.status).toBe(200);
 });
});
