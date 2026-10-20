'use client';
import {useEffect} from 'react';
import {readConsentCookie} from '@/lib/cookie-consent';
import {metaPurchaseCents} from '@/lib/meta-purchase-eligibility';
import {wasPurchaseClaimed,purchaseNavigationAttempted,markPurchaseNavigation} from '@/lib/meta-purchase-client';
type Order={id:string;status:string;paymentStatus?:string|null;paymentMethod?:string|null;total?:unknown;acceptanceReview?:unknown;paymentReviewRequired?:unknown;requiresCapacityDecision?:unknown;automaticRefundStatus?:string|null;refundedAmountCents?:number};
export default function PurchaseObserver({order}:{order:Order}){
 const signature=JSON.stringify([order.id,order.status,order.paymentStatus,order.paymentMethod,order.total,order.acceptanceReview,order.paymentReviewRequired,order.requiresCapacityDecision,order.automaticRefundStatus,order.refundedAmountCents]);
 useEffect(()=>{
  const consent=readConsentCookie(document.cookie);if(!consent?.adult||!(consent.marketing||consent.analytics))return;
  // Meta's cash commitment differs deliberately from GA4's paid purchase.
  const meta=consent.marketing&&metaPurchaseCents(order,order.id)!==null;
  const analytics=consent.analytics&&order.paymentStatus==='PAID'&&['CONFIRMED','PREPARING','READY','OUT','DELIVERED'].includes(order.status);
  if(!meta&&!analytics)return;
  let cancelled=false,timer:ReturnType<typeof setTimeout>|undefined,attempt=0;const controllers=new Set<AbortController>();
  const retry=()=>{if(!cancelled&&attempt<4)timer=setTimeout(()=>void run(),[1000,3000,8000][attempt-1]??8000);};
  async function run(){
   if(cancelled||readConsentCookie(document.cookie)?.receiptId!==consent!.receiptId)return;attempt++;
   const controller=new AbortController();controllers.add(controller);const timeout=setTimeout(()=>controller.abort(),5000);
   try{
    const response=await fetch('/api/marketing/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id}),signal:controller.signal});
    if(!response.ok){if([408,409,425,429].includes(response.status)||response.status>=500)retry();return;}
    const data=await response.json();if(cancelled||!data.ready||!/^ltp_[a-f0-9]{64}$/.test(data.eventId)||readConsentCookie(document.cookie)?.receiptId!==consent!.receiptId)return;
    const needMeta=consent!.marketing&&data.metaEligible!==false&&!purchaseNavigationAttempted(data.eventId,'meta')&&!await wasPurchaseClaimed(data.eventId,'meta');
    const needGA=consent!.analytics&&data.analyticsEligible!==false&&!purchaseNavigationAttempted(data.eventId,'ga4')&&!await wasPurchaseClaimed(data.eventId,'ga4');
    if(cancelled||(!needMeta&&!needGA)||readConsentCookie(document.cookie)?.receiptId!==consent!.receiptId)return;
    try{sessionStorage.setItem('lt_meta_active_purchase',data.eventId);if(sessionStorage.getItem('lt_meta_active_purchase')!==data.eventId)return;}catch{return;}
    if(!markPurchaseNavigation(data.eventId,needMeta,needGA))return;
    location.replace('/acquisto-completato');
   }catch{retry();}finally{clearTimeout(timeout);controllers.delete(controller);}
  }
  void run();return()=>{cancelled=true;if(timer)clearTimeout(timer);controllers.forEach(c=>c.abort());};
 // The signature contains every field consulted by eligibility; polling unchanged data never replays.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[signature]);return null;
}
