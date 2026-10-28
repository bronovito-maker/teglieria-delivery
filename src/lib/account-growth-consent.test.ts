import {describe,it,expect,vi} from 'vitest';
import {applyAccountGrowthChoice,needsGrowthWithdrawalRetry} from './account-growth-consent';
import {CONSENT_VERSION,CONSENT_SECONDS,parseConsent} from './cookie-consent';
const all={personalization:true,history:true,adult:true};
function fixture(current:object={linked:false},failPath?:string){
 const calls:{path:string;init?:RequestInit;body?:any}[]=[];
 const fetcher=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const path=String(input);calls.push({path,init,body:init?.body?JSON.parse(String(init.body)):undefined});
  if(path===failPath)return Response.json({error:'synthetic failure'},{status:503});
  if(path==='/api/auth/session')return Response.json({user:{id:'synthetic-account',app_metadata:{role:'customer'}}});
  if(path.endsWith('/preferences')&&(!init?.method||init.method==='GET'))return Response.json(current);
  return Response.json({receipt_id:'synthetic-durable-receipt'});
 }) as typeof fetch;
 return {calls,fetcher};
}
describe('unified banner and Growth consent',()=>{
 it('automatically enrolls an authenticated existing profile, identity derived server-side',async()=>{
  const {calls,fetcher}=fixture();const r=await applyAccountGrowthChoice(all,fetcher);
  expect(calls[2].path).toBe('/api/account/growth/enroll');expect(calls[2].body).toEqual({personalization:true,history:true,adult_confirmed:true,policy_version:'growth-account-v2'});
  expect(r).toEqual({guest:false,accountId:'synthetic-account',receiptId:'synthetic-durable-receipt'});
  expect(calls.every(c=>c.init?.credentials==='same-origin')).toBe(true);
  expect(new Headers(calls[2].init?.headers).get('X-Growth-Account')).toBe('synthetic-account');
 });
 it('updates already linked customers without creating another identity or enabling marketing sends',async()=>{
  const {calls,fetcher}=fixture({linked:true});await applyAccountGrowthChoice(all,fetcher);
  expect(calls[2].init?.method).toBe('PUT');expect(calls[2].body).toEqual({personalization:true,history:true,email:false,in_app:false,policy_version:'growth-account-v2'});
 });
 it('guests can choose cookies without creating customer profiles',async()=>{
  let calls=0;const fetcher=(async()=>{calls++;return Response.json({user:null});}) as typeof fetch;
  expect(await applyAccountGrowthChoice(all,fetcher)).toEqual({guest:true});expect(calls).toBe(1);
 });
 it('rejects minor personalization and history without profiling before any I/O',async()=>{
  const {calls,fetcher}=fixture();await expect(applyAccountGrowthChoice({...all,adult:false},fetcher)).rejects.toThrow();
  await expect(applyAccountGrowthChoice({...all,personalization:false},fetcher)).rejects.toThrow();expect(calls).toHaveLength(0);
 });
 it('essential-only choice does not enroll an unlinked customer',async()=>{
  const {calls,fetcher}=fixture();await applyAccountGrowthChoice({personalization:false,history:false,adult:false},fetcher);expect(calls).toHaveLength(2);
 });
 it('withdraws linked profile and history without requiring a new adult declaration',async()=>{
  const {calls,fetcher}=fixture({linked:true});await applyAccountGrowthChoice({personalization:false,history:false,adult:false},fetcher);
  expect(calls[2].body.personalization).toBe(false);expect(calls[2].body.history).toBe(false);
 });
 it('customization can keep personalization while excluding prior history',async()=>{
  const {calls,fetcher}=fixture({linked:true});await applyAccountGrowthChoice({...all,history:false},fetcher);expect(calls[2].body.history).toBe(false);
 });
 it('pending enrollment is retried explicitly and cannot be reported saved during an outage',async()=>{
  const {calls,fetcher}=fixture({pending:true,linked:false},'/api/account/growth/enroll');
  await expect(applyAccountGrowthChoice(all,fetcher)).rejects.toThrow('non confermata');expect(calls[2].path).toContain('enroll');
 });
 it('cancels a partial enrollment through the privacy fence instead of completing an unwanted opt-in',async()=>{
  const {calls,fetcher}=fixture({pending:true,linked:false});await applyAccountGrowthChoice({personalization:false,history:false,adult:false},fetcher);
  expect(calls[2].path).toBe('/api/account/growth/erase-optional');expect(calls[2].body).toEqual({confirm:true});
 });
 it('does not claim success without the durable receipt',async()=>{
  const {fetcher}=fixture();const wrapped=(async(input:RequestInfo|URL,init?:RequestInit)=>init?.method==='POST'?Response.json({linked:true}):fetcher(input,init)) as typeof fetch;
  await expect(applyAccountGrowthChoice(all,wrapped)).rejects.toThrow('conferma del consenso');
 });
 it('account/session/consent-service outages do not become a confirmed grant',async()=>{
  for(const path of ['/api/auth/session','/api/account/growth/preferences','/api/account/growth/enroll']){
   const {fetcher}=fixture({},path);await expect(applyAccountGrowthChoice(all,fetcher)).rejects.toThrow();
  }
 });
 it('old cookie acceptances cannot authorize the new profiling purpose',()=>{
  const now=Date.now(),value={version:'2026-10-20-meta-funnel-v6',receiptId:crypto.randomUUID(),recordedAt:now,expiresAt:now+CONSENT_SECONDS*1000,adult:true,marketing:true,analytics:true};
  expect(parseConsent(encodeURIComponent(JSON.stringify(value)))).toBe(null);
  expect(parseConsent(encodeURIComponent(JSON.stringify({...value,version:CONSENT_VERSION,personalization:true,history:true})))).not.toBe(null);
  expect(parseConsent(encodeURIComponent(JSON.stringify({...value,version:CONSENT_VERSION,adult:false,personalization:true})))).toBe(null);
 });
});

it('automatic retries only withdraw, never replay an old grant or transfer it between accounts',()=>{
 const now=Date.now(),base={version:CONSENT_VERSION,receiptId:crypto.randomUUID(),recordedAt:now,expiresAt:now+CONSENT_SECONDS*1000,analytics:false,marketing:false,adult:false,personalization:false,history:false,profileAccountId:'account-A',growthWithdrawalPending:true} as const;
 expect(needsGrowthWithdrawalRetry(base,'account-A')).toBe(true);expect(needsGrowthWithdrawalRetry(base,'account-B')).toBe(false);expect(needsGrowthWithdrawalRetry({...base,personalization:true},'account-A')).toBe(false);expect(needsGrowthWithdrawalRetry({...base,growthWithdrawalPending:false},'account-A')).toBe(false);
});

it('bounds an unavailable account request using AbortController without requiring AbortSignal.timeout',async()=>{
 vi.useFakeTimers();
 try{
  const fetcher=((_url:RequestInfo|URL,init?:RequestInit)=>new Promise<Response>((_resolve,reject)=>init?.signal?.addEventListener('abort',()=>reject(new Error('Request timeout')),{once:true}))) as typeof fetch;
  const checked=expect(applyAccountGrowthChoice(all,fetcher)).rejects.toThrow('Request timeout');
  await vi.advanceTimersByTimeAsync(8001);await checked;
 }finally{vi.useRealTimers();}
});
