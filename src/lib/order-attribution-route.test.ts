import {afterEach,describe,expect,it,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {CONSENT_COOKIE,CONSENT_SECONDS,CONSENT_VERSION} from './cookie-consent';
import {ORDER_ATTRIBUTION_COOKIE,signOrderAttribution} from './order-attribution';
import {POST} from '../app/api/ordini/route';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('actual order route CRM consent boundary',()=>{
 for(const scenario of ['consented','no-opt-in','essential-only','forged-token','different-receipt','expired-token'] as const){
  it(scenario,async()=>{
   vi.stubEnv('UNIFIED_WEB_GATEWAY_KEY','synthetic-private-unified28-gateway');vi.stubEnv('UNIFIED_BACKEND_URL','https://gateway.example');
   const fetcher=vi.fn().mockResolvedValue(new Response('{}',{status:200}));vi.stubGlobal('fetch',fetcher);
   const now=Date.now(),id='00000000-0000-4000-8000-000000000001';
   const consent={version:CONSENT_VERSION,receiptId:id,recordedAt:now,expiresAt:now+CONSENT_SECONDS*1000,analytics:scenario!=='essential-only',marketing:false,adult:scenario!=='essential-only'};
   let token=await signOrderAttribution({campaign_source:'instagram',campaign_medium:'paid_social',campaign_id:'123'},scenario==='different-receipt'?'00000000-0000-4000-8000-000000000002':id,scenario==='expired-token'?now-1_800_001:now);
   if(scenario==='forged-token')token='FORGED';
   const headers:Record<string,string>={'content-type':'application/json','origin':'https://lateglieria.it','cookie':`${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}; ${ORDER_ATTRIBUTION_COOKIE}=${token}`,'x-order-attribution':'FORGED-BROWSER-HEADER'};
   if(scenario!=='no-opt-in')headers['x-crm-attribution-consent']='yes';
   const response=await POST(new NextRequest('https://lateglieria.it/api/ordini',{method:'POST',headers,body:'{}'}));expect(response.status).toBe(200);
   const proof=fetcher.mock.calls[0][1].headers.get('x-order-attribution');
   if(scenario==='consented')expect(JSON.parse(proof)).toMatchObject({source:'instagram',campaign_id:'123',profile_opt_in:true,consent_receipt_id:id});
   else expect(proof).toBeNull();
  });
 }
});
