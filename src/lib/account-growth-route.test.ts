import {describe,it,expect,vi,beforeEach} from 'vitest';
import {NextRequest} from 'next/server';
const mocks=vi.hoisted(()=>({user:{id:'account-A'} as {id:string}|null,proxy:vi.fn(async()=>Response.json({ok:true}))}));
vi.mock('@/lib/auth/server',()=>({createClient:async()=>({auth:{getUser:async()=>({data:{user:mocks.user}})}})}));
vi.mock('@/lib/backend-proxy',()=>({backendProxy:mocks.proxy}));
import {POST} from '../app/api/account/growth/[operation]/route';
beforeEach(()=>{process.env.GROWTH_ACCOUNT_UI_ENABLED='1';mocks.user={id:'account-A'};mocks.proxy.mockClear();});
describe('account consent identity boundary',()=>{
 it('rejects an account changed between banner click and submission',async()=>{
  const r=await POST(new NextRequest('https://lateglieria.it/api/account/growth/enroll',{method:'POST',headers:{'X-Growth-Account':'account-B'}}),{params:Promise.resolve({operation:'enroll'})});
  expect(r.status).toBe(409);expect(mocks.proxy).not.toHaveBeenCalled();
 });
 it('allows the authenticated matching account and keeps identity selection server-side',async()=>{
  const r=await POST(new NextRequest('https://lateglieria.it/api/account/growth/enroll',{method:'POST',headers:{'X-Growth-Account':'account-A'}}),{params:Promise.resolve({operation:'enroll'})});
  expect(r.status).toBe(200);expect(mocks.proxy).toHaveBeenCalledOnce();
 });
 it('does not create a consent for an unauthenticated request',async()=>{
  mocks.user=null;const r=await POST(new NextRequest('https://lateglieria.it/api/account/growth/enroll',{method:'POST'}),{params:Promise.resolve({operation:'enroll'})});
  expect(r.status).toBe(401);expect(mocks.proxy).not.toHaveBeenCalled();
 });
});
