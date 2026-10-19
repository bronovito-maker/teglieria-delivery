import {afterEach,describe,it,expect,vi} from 'vitest';
import {newPasswordProblem,sanitizeCustomerNext,orderReturnPath,duplicateRegistration,customerAuthFailure,waitForCustomerSession,postCustomerAuth,isCustomerSession,rememberGoogleReturn,consumeGoogleReturn,clearGoogleReturn} from './customer-auth-flow';
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();});
const customer={authenticated:true,user:{id:'synthetic-customer',app_metadata:{role:'customer'}}};
describe('customer registration requirements mirror native validation',()=>{
 for(const password of ['abc123','Abcdef12345','a'.repeat(12),' \t\n'.repeat(5),'\u0085\u2003'.repeat(7),'😀'.repeat(12),'a'.repeat(1025)])it('rejects '+JSON.stringify(password.slice(0,18)),()=>expect(newPasswordProblem(password)).not.toBeNull());
 for(const password of ['Teglieria2026!','una frase lunga','😀'.repeat(11)+'a','ab'.repeat(512)])it('accepts valid '+password.slice(0,18),()=>expect(newPasswordProblem(password)).toBeNull());
 it('counts unicode characters instead of UTF-16 units',()=>expect(newPasswordProblem('😀'.repeat(6)+'a')).toContain('12'));
});
describe('actionable errors without credential blame for infrastructure',()=>{
 it('distinguishes credentials',()=>expect(customerAuthFailure(401,'login')).toContain('Email o password'));
 it('distinguishes throttling with bounded retry advice',()=>{expect(customerAuthFailure(429,'login','','60')).toContain('60 secondi');expect(customerAuthFailure(429,'login','','90000')).toContain('un minuto');});
 it('distinguishes temporary errors and never echoes arbitrary upstream text',()=>{expect(customerAuthFailure(503,'login','secret text')).not.toContain('secret text');expect(customerAuthFailure(0,'register')).toContain('connessione');});
 it('recognizes native duplicate response and not arbitrary validation failures',()=>{expect(duplicateRegistration(409)).toBe(true);expect(duplicateRegistration(422,'already registered')).toBe(true);expect(duplicateRegistration(422,'wrong password')).toBe(false);});
 it('explains the account policy',()=>expect(customerAuthFailure(400,'register','almeno 18 anni e informativa')).toContain('dichiarazione'));
});
describe('safe booking continuation',()=>{
 for(const path of ['https://evil.test','//evil.test','/\\evil.test','/api/auth/logout','/accedi','/registrati','/admin','/ordine\nX'])it('rejects '+JSON.stringify(path),()=>expect(sanitizeCustomerNext(path)).toBe('/menu'));
 it('preserves date/time and drops fragments',()=>{const path=orderReturnPath('2026-10-24','19:30');expect(sanitizeCustomerNext(path+'#private')).toBe('/ordine?date=2026-10-24&time=19%3A30');});
 it('only retains bounded booking fields',()=>expect(orderReturnPath('private@email.test','secret')).toBe('/ordine'));
 it('preserves legitimate customer destinations',()=>expect(sanitizeCustomerNext('/account/orders')).toBe('/account/orders'));
});
describe('real session, not just HTTP success',()=>{
 for(const value of [{authenticated:false,user:null},{authenticated:true,user:null},{authenticated:true,user:{id:'a',app_metadata:{role:'admin'}}},{user:customer.user},null])it('rejects noncustomer or missing sessions '+JSON.stringify(value),()=>expect(isCustomerSession(value)).toBe(false));
 it('requires a customer identity',()=>expect(isCustomerSession(customer)).toBe(true));
 it('does not accept HTTP 200 with user null',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({authenticated:false,user:null}))));expect(await waitForCustomerSession(1)).toBe(false);});
 it('retries transient missing cookies without resubmitting credentials',async()=>{const fetcher=vi.fn().mockResolvedValueOnce(new Response('{"authenticated":false,"user":null}')).mockResolvedValueOnce(new Response(JSON.stringify(customer)));vi.stubGlobal('fetch',fetcher);expect(await waitForCustomerSession(2)).toBe(true);expect(fetcher.mock.calls).toHaveLength(2);expect(fetcher.mock.calls.every(c=>c[0]==='/api/auth/session')).toBe(true);});
 it('handles a non-JSON gateway response',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>Unavailable</html>',{status:502})));expect(await postCustomerAuth('login',{})).toMatchObject({ok:false,status:502});});
 it('does not treat a successful HTML/empty response as a created account',async()=>{vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('<html>error</html>')));expect(await postCustomerAuth('register',{})).toMatchObject({ok:false,status:502});});
 it('sends policy and exact password without trimming spaces',async()=>{const f=vi.fn().mockResolvedValue(new Response('{}'));vi.stubGlobal('fetch',f);await postCustomerAuth('register',{password:' passphrase ok ',policy:{adult:true}});expect(JSON.parse(f.mock.calls[0][1].body)).toMatchObject({password:' passphrase ok ',policy:{adult:true}});});
 it('times out a stalled network instead of leaving form loading forever',async()=>{vi.useFakeTimers();vi.stubGlobal('fetch',vi.fn((_url,init)=>new Promise((_resolve,reject)=>init.signal.addEventListener('abort',()=>reject(new Error('timeout'))))));const assertion=expect(postCustomerAuth('register',{})).rejects.toThrow('timeout');await vi.advanceTimersByTimeAsync(15001);await assertion;});
});

describe('same-tab Google return after the existing /menu callback',()=>{
 function storage(){const values=new Map<string,string>();vi.stubGlobal('sessionStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)});return values;}
 it('restores a booking once without storing credentials',()=>{const values=storage();rememberGoogleReturn('/ordine?date=2026-10-24&time=19%3A00',1000);expect([...values.values()][0]).not.toMatch(/password|email|token/);expect(consumeGoogleReturn(1001)).toBe('/ordine?date=2026-10-24&time=19%3A00');expect(consumeGoogleReturn(1002)).toBeNull();});
 it('drops expired intents',()=>{storage();rememberGoogleReturn('/ordine',1000);expect(consumeGoogleReturn(601001)).toBeNull();});
 it('never stores an external or account-login destination',()=>{const values=storage();rememberGoogleReturn('//evil.test',1000);expect(values.size).toBe(0);rememberGoogleReturn('/registrati',1000);expect(values.size).toBe(0);});
 it('manual password choice clears a cancelled Google return',()=>{storage();rememberGoogleReturn('/ordine',1000);clearGoogleReturn();expect(consumeGoogleReturn(1001)).toBeNull();});
 it('storage restrictions do not break authentication',()=>{vi.stubGlobal('sessionStorage',{setItem:()=>{throw Error('blocked');},getItem:()=>{throw Error('blocked');},removeItem:()=>{throw Error('blocked');}});expect(()=>rememberGoogleReturn('/ordine')).not.toThrow();expect(consumeGoogleReturn()).toBeNull();});
});
