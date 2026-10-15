import {afterEach,describe,it,expect,vi} from 'vitest';
import {scryptSync} from 'node:crypto';
import {previewAccess} from './preview-access';
const password='Preview-only-2026!';const salt='00'.repeat(16);const record=JSON.stringify({version:1,username:'teglieria',salt,hash:scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex')});
const request=(path='/',method='GET',auth?:string)=>new Request('https://lateglieria.it'+path,{method,headers:auth?{authorization:'Basic '+Buffer.from(auth).toString('base64')}:undefined});
afterEach(()=>vi.unstubAllEnvs());
describe('Vercel private preview',()=>{
 it('fails closed when Vercel has no explicit deployment mode',async()=>{vi.stubEnv('VERCEL','1');vi.stubEnv('UNIFIED_PREVIEW_MODE','');expect((await previewAccess(request()))?.status).toBe(503);});
 it('does not add a second gate to the existing local proxy by default',async()=>{vi.stubEnv('VERCEL','');vi.stubEnv('UNIFIED_PREVIEW_MODE','');expect(await previewAccess(request())).toBeNull();});
 it('requires a complete credential record, even for webhooks',async()=>{vi.stubEnv('UNIFIED_PREVIEW_MODE','private');vi.stubEnv('UNIFIED_PREVIEW_AUTH','{}');expect((await previewAccess(request('/api/stripe/webhook','POST')))?.status).toBe(503);});
 for(const path of ['/','/menu','/account/orders','/api/auth/password','/api/auth/callback','/api/auth/session','/_next/static/app.js','/logo.png'])it('protects '+path,async()=>{vi.stubEnv('UNIFIED_PREVIEW_MODE','private');vi.stubEnv('UNIFIED_PREVIEW_AUTH',record);expect((await previewAccess(request(path)))?.status).toBe(401);});
 it('accepts the current password and rejects an invalid one',async()=>{vi.stubEnv('UNIFIED_PREVIEW_MODE','private');vi.stubEnv('UNIFIED_PREVIEW_AUTH',record);expect(await previewAccess(request('/menu','GET','teglieria:'+password))).toBeNull();expect((await previewAccess(request('/menu','GET','teglieria:wrong-password-2026')))?.status).toBe(401);});
 it('exempts only the exact POST webhook, not query strings or GET',async()=>{vi.stubEnv('UNIFIED_PREVIEW_MODE','private');vi.stubEnv('UNIFIED_PREVIEW_AUTH',record);expect(await previewAccess(request('/api/stripe/webhook','POST'))).toBeNull();expect((await previewAccess(request('/api/stripe/webhook?x=1','POST')))?.status).toBe(401);expect((await previewAccess(request('/api/stripe/webhook')))?.status).toBe(401);});
 it('public access requires explicit public mode',async()=>{vi.stubEnv('VERCEL','1');vi.stubEnv('UNIFIED_PREVIEW_MODE','public');expect(await previewAccess(request())).toBeNull();});
});
