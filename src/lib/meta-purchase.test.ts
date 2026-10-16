import { beforeAll, describe, expect, it } from 'vitest';
import { CONSENT_VERSION, type CookieConsent } from './cookie-consent';
import { confirmedPurchase, eventIdFor, signTicket, readTicket, purchasePublic, publicReceipts, receiptName, type Ticket } from './meta-purchase-server';
import { permitsPurchase } from './meta-purchase-client';
const id='00000000-0000-4000-8000-000000000001',now=Date.now();
const consent:CookieConsent={version:CONSENT_VERSION,receiptId:'00000000-0000-4000-8000-000000000002',recordedAt:now,expiresAt:now+86400000,analytics:false,marketing:true,adult:true};
let ticket:Ticket;
beforeAll(async()=>{process.env.UNIFIED_WEB_GATEWAY_KEY='synthetic-key-only-000000000000000000000';ticket={kind:'receipt',orderId:id,eventId:await eventIdFor(id),consentId:consent.receiptId,version:CONSENT_VERSION,issuedAt:now,expiresAt:now+600000,cents:1850,currency:'EUR'};});
describe('authoritative purchase eligibility',()=>{
 const paid={id,total:18.50,paymentStatus:'PAID',status:'CONFIRMED',automaticRefundStatus:'NONE',refundedAmountCents:0};
 it.each(['STRIPE','CASH'])('counts a paid, accepted %s order with the backend total',method=>expect(confirmedPurchase({...paid,paymentMethod:method},id)).toBe(1850));
 it.each([{status:'RECEIVED'},{status:'CANCELLED'},{paymentStatus:'PENDING'},{paymentStatus:'AUTHORIZED'},{paymentStatus:'REFUNDED'},{paymentStatus:'PARTIALLY_REFUNDED'},{refundedAmountCents:1},{automaticRefundStatus:'QUEUED'},{paymentReviewRequired:true},{requiresCapacityDecision:true},{id:'other'},{total:NaN},{total:0},{total:-1},{total:1.234},{total:'1e3'},{total:Infinity}])('rejects non-final or unsafe purchase %j',patch=>expect(confirmedPurchase({...paid,...patch},id)).toBeNull());
 it('uses cents without rounding arbitrary precision',()=>expect(confirmedPurchase({...paid,total:'18.50'},id)).toBe(1850));
});
describe('signed conversion tickets',()=>{
 it('verifies signature and derives stable pseudonymous event IDs',async()=>{expect(await readTicket(await signTicket(ticket),'receipt',now)).toEqual(ticket);expect(await eventIdFor(id)).toBe(ticket.eventId);expect(ticket.eventId).not.toContain(id);});
 it('rejects tampering and wrong purpose',async()=>{const raw=await signTicket(ticket);expect(await readTicket(raw.slice(0,-3)+'abc','receipt',now)).toBeNull();expect(await readTicket(raw,'intent',now)).toBeNull();});
 it.each([{expiresAt:now},{expiresAt:now+600001},{cents:-1},{cents:1.5},{currency:'USD'},{version:'old'},{eventId:'ltp_'+'f'.repeat(64)}])('rejects signed but invalid receipt %j',async patch=>expect(await readTicket(await signTicket({...ticket,...patch} as Ticket),'receipt',now)).toBeNull());
 it('exposes only amount, currency, pseudonym and consent metadata',()=>{const p=purchasePublic(ticket);expect(Object.keys(p).sort()).toEqual(['cents','consentId','currency','eventId','expiresAt']);expect(JSON.stringify(p)).not.toContain(id);});
 it('binds public receipts to exact current adult consent',async()=>{const c=[{name:receiptName(ticket.eventId),value:await signTicket(ticket)}];expect(await publicReceipts(c,consent)).toHaveLength(1);for(const invalid of [null,{...consent,adult:false},{...consent,marketing:false},{...consent,receiptId:'different'}])expect(await publicReceipts(c,invalid)).toEqual([]);});
 it('permits only a clean receipt document, current consent and unexpired amount',()=>{const p=purchasePublic(ticket),url=new URL('https://example.invalid/acquisto-completato');expect(permitsPurchase(consent,url,p,now)).toBe(true);for(const path of ['/ordine','/stato-ordine/private','/acquisto-completato?email=private','/acquisto-completato#secret'])expect(permitsPurchase(consent,new URL(path,url),p,now)).toBe(false);expect(permitsPurchase({...consent,marketing:false},url,p,now)).toBe(false);expect(permitsPurchase(consent,url,{...p,consentId:'different'},now)).toBe(false);expect(permitsPurchase(consent,url,p,now+600001)).toBe(false);});
});
