 'use client';
import { useEffect, useRef } from 'react';
import { readConsentCookie } from '@/lib/cookie-consent';
export default function PurchaseObserver({order}:{order:{id:string;status:string;paymentStatus?:string}}){
 const attempted=useRef('');
 useEffect(()=>{
  const consent=readConsentCookie(document.cookie);
  if(!(consent?.marketing||consent?.analytics)||!consent.adult||order.paymentStatus!=='PAID'||!['CONFIRMED','PREPARING','READY','OUT','DELIVERED'].includes(order.status)||attempted.current===order.id)return;
  attempted.current=order.id;
  void fetch('/api/marketing/purchase',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id})}).then(async response=>{
   if(!response.ok)return;const data=await response.json();
   if(!data.ready||!/^ltp_[a-f0-9]{64}$/.test(data.eventId)||readConsentCookie(document.cookie)?.receiptId!==consent.receiptId)return;
   try{sessionStorage.setItem('lt_meta_active_purchase',data.eventId);if(sessionStorage.getItem('lt_meta_active_purchase')!==data.eventId)return;}catch{return;}
   location.replace('/acquisto-completato');
  }).catch(()=>{});

 },[order.id,order.status,order.paymentStatus]);
 return null;
}
