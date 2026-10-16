 'use client';
import { readConsentCookie } from '@/lib/cookie-consent';
import { useEffect, useRef, useState } from 'react';
export default function PurchaseReturn({fallback}:{fallback:string}){
 const form=useRef<HTMLFormElement>(null),[eventId,setEventId]=useState(fallback);
 useEffect(()=>{
  try{const id=sessionStorage.getItem('lt_meta_active_purchase');if(id&&/^ltp_[a-f0-9]{64}$/.test(id))setEventId(id);}catch{}
  let timer:ReturnType<typeof setTimeout>;
  const consent=readConsentCookie(document.cookie),pending=new Set([...(consent?.marketing?['lt:meta-purchase-settled']:[]),...(consent?.analytics?['lt:ga4-purchase-settled']:[])]);
  const done=(event:Event)=>{pending.delete(event.type);if(pending.size)return;clearTimeout(timer);timer=setTimeout(()=>form.current?.requestSubmit(),800);};
  window.addEventListener('lt:meta-purchase-settled',done);window.addEventListener('lt:ga4-purchase-settled',done);
  timer=setTimeout(()=>form.current?.requestSubmit(),5000);
  return ()=>{clearTimeout(timer);window.removeEventListener('lt:meta-purchase-settled',done);window.removeEventListener('lt:ga4-purchase-settled',done);};
 },[]);
 return <form ref={form} method="post" action="/acquisto-completato/torna"><input type="hidden" name="eventId" value={eventId}/><button className="rounded-xl border px-5 py-3" type="submit">Torna al tuo ordine</button></form>;
}
