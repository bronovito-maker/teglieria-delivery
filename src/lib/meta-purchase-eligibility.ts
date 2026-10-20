// Pure commercial eligibility shared by the UI and the authoritative proxy.
const accepted=new Set(['CONFIRMED','PREPARING','READY','OUT','DELIVERED']);
export function metaPurchaseCents(order:unknown,id:string):number|null {
 if(!order||typeof order!=='object')return null;const v=order as Record<string,unknown>;
 if(v.id!==id||v.status==='CANCELLED'||v.paymentReviewRequired===true||(v.automaticRefundStatus!=null&&v.automaticRefundStatus!=='NONE')||Number(v.refundedAmountCents??0)!==0)return null;
 const method=v.paymentMethod;
 if(method==='STRIPE') {if(v.paymentStatus!=='PAID'||!['RECEIVED',...accepted].includes(String(v.status)))return null;}
 else if(method==='CONTANTI') {if(!accepted.has(String(v.status))||(v.acceptanceReview!=null&&v.acceptanceReview!==false)||v.requiresCapacityDecision===true||!['PENDING','UNPAID','PAID'].includes(String(v.paymentStatus)))return null;}
 else return null;
 const total=v.total;if(typeof total!=='number'&&(typeof total!=='string'||!/^\d{1,7}(\.\d{1,2})?$/.test(total)))return null;
 const n=Number(total),cents=Math.round(n*100);return Number.isFinite(n)&&Number.isSafeInteger(cents)&&cents>0&&cents<=100000000&&Math.abs(n*100-cents)<.000001?cents:null;
}
