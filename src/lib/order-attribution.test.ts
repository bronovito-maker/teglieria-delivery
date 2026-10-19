import {afterEach,describe,expect,it,vi} from 'vitest';
import {readOrderAttribution,signOrderAttribution} from './order-attribution';

const receipt='00000000-0000-4000-8000-000000000001';
afterEach(()=>vi.unstubAllEnvs());
describe('consented order attribution proof',()=>{
 it('keeps only bounded paid-social codes and binds them to the consent receipt',async()=>{
  vi.stubEnv('UNIFIED_WEB_GATEWAY_KEY','test-secret-longer-than-thirty-two-chars');
  const at=Date.now();const token=await signOrderAttribution({campaign_source:'instagram',campaign_medium:'paid_social',campaign_id:'123',campaign_content:'456'},receipt,at);
  expect(await readOrderAttribution(token!,receipt,at)).toMatchObject({source:'instagram',medium:'paid_social',campaign_id:'123',ad_id:'456'});
  expect(await readOrderAttribution(token!,'00000000-0000-4000-8000-000000000002',at)).toBeNull();
  expect(await readOrderAttribution(token!,receipt,at+1_800_001)).toBeNull();
  const tampered=(token![0]==='A'?'B':'A')+token!.slice(1);
  expect(await readOrderAttribution(tampered,receipt,at)).toBeNull();
 });
 it('rejects organic social, drops private campaign text, and needs a server key',async()=>{
  vi.stubEnv('UNIFIED_WEB_GATEWAY_KEY','test-secret-longer-than-thirty-two-chars');
  expect(await signOrderAttribution({campaign_source:'facebook',campaign_medium:'social'},receipt)).toBeNull();
  const token=await signOrderAttribution({campaign_source:'facebook',campaign_medium:'paid_social',campaign_id:'PRIVATE'},receipt);
  expect(await readOrderAttribution(token!,receipt)).not.toHaveProperty('campaign_id');
  vi.stubEnv('UNIFIED_WEB_GATEWAY_KEY','short');
  expect(await signOrderAttribution({campaign_source:'facebook',campaign_medium:'paid_social'},receipt)).toBeNull();
 });
});
