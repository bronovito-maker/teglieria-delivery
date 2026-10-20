import {beforeEach,describe,expect,it,vi} from 'vitest';
import {metaPurchaseCents} from './meta-purchase-eligibility';
import {confirmedPurchase,signTicket,readTicket,publicReceipts,receiptName,eventIdFor} from './meta-purchase-server';
import {CONSENT_VERSION,type CookieConsent} from './cookie-consent';
import {registrationTicket,readRegistration} from './meta-registration-server';
const id='00000000-0000-4000-8000-000000000032';
const paid={id,total:21.5,paymentMethod:'STRIPE',paymentStatus:'PAID',status:'CONFIRMED'};
const c:CookieConsent={version:CONSENT_VERSION,receiptId:id,recordedAt:Date.now(),expiresAt:Date.now()+365*86400000,analytics:true,marketing:true,adult:true};
beforeEach(()=>{process.env.UNIFIED_WEB_GATEWAY_KEY='synthetic-meta-only-key-32-not-production';});
describe('Meta32 independent commercial rule',()=>{
 it('Stripe only after PAID, without waiting for cashier acceptance',()=>{expect(metaPurchaseCents({...paid,status:'RECEIVED',acceptanceReview:{message:'waiting'},requiresCapacityDecision:true},id)).toBe(2150);expect(confirmedPurchase({...paid,status:'RECEIVED'},id)).toBeNull();});
 it.each(['PENDING','AUTHORIZED','FAILED','REFUNDED','PARTIALLY_REFUNDED'])('never counts unpaid or refunded card %s',paymentStatus=>expect(metaPurchaseCents({...paid,paymentStatus},id)).toBeNull());
 it.each(['CONFIRMED','PREPARING','READY','OUT','DELIVERED'])('cash counts once committed by cashier at %s before collection',status=>{expect(metaPurchaseCents({...paid,paymentMethod:'CONTANTI',paymentStatus:'PENDING',status},id)).toBe(2150);expect(confirmedPurchase({...paid,paymentMethod:'CONTANTI',paymentStatus:'PENDING',status},id)).toBeNull();});
 it.each(['RECEIVED','CANCELLED'])('unaccepted/cancelled cash excluded at %s',status=>expect(metaPurchaseCents({...paid,paymentMethod:'CONTANTI',paymentStatus:'PENDING',status},id)).toBeNull());
 it.each([{paymentMethod:'UNKNOWN'},{paymentReviewRequired:true},{automaticRefundStatus:'QUEUED'},{refundedAmountCents:1},{status:'CANCELLED'},{id:'other'},{total:NaN},{total:0},{total:-1},{total:'1e3'},{total:1.234}])('rejects unsafe order %j',patch=>expect(metaPurchaseCents({...paid,...patch},id)).toBeNull());
 it('cash review object must not bypass the acceptance gate',()=>expect(metaPurchaseCents({...paid,paymentMethod:'CONTANTI',acceptanceReview:{message:'review'}},id)).toBeNull());
 it('signed cash Meta receipt cannot turn on GA4 prematurely',async()=>{const now=Date.now(),eventId=await eventIdFor(id);const t={kind:'receipt' as const,orderId:id,eventId,consentId:id,version:CONSENT_VERSION,issuedAt:now,expiresAt:now+600000,cents:2150,currency:'EUR' as const,metaEligible:true,analyticsEligible:false};const raw=await signTicket(t);expect(await readTicket(raw,'receipt')).toEqual(t);const p=await publicReceipts([{name:receiptName(eventId),value:raw}],c);expect(p[0].analyticsEligible).toBe(false);});
});
describe('verified registration receipt',()=>{
 const eventId='ltr_'+'a'.repeat(64);
 it('accepts only a signed receipt bound to current advertising consent',async()=>{const raw=await registrationTicket(eventId,c);expect((await readRegistration(raw,c))?.eventId).toBe(eventId);expect(await readRegistration(raw,{...c,receiptId:'different'})).toBeNull();expect(await readRegistration(raw,{...c,marketing:false})).toBeNull();expect(await readRegistration(raw,{...c,adult:false})).toBeNull();});
 it('rejects expired and tampered proof',async()=>{const raw=await registrationTicket(eventId,c);expect(await readRegistration(raw+'x',c)).toBeNull();expect(await readRegistration(raw,c,Date.now()+600001)).toBeNull();});
 it('no proof from a rejected/duplicate/login registration or private account field',async()=>{expect(await readRegistration(undefined,c)).toBeNull();await expect(registrationTicket('PRIVATE_EMAIL',c)).rejects.toThrow();});
});
