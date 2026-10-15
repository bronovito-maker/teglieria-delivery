 'use client';
import { useEffect, useRef, useState } from 'react';
export default function PurchaseReturn({fallback}:{fallback:string}){
 const form=useRef<HTMLFormElement>(null),[eventId,setEventId]=useState(fallback);
 useEffect(()=>{
  try{const id=sessionStorage.getItem('lt_meta_active_purchase');if(id&&/^ltp_[a-f0-9]{64}$/.test(id))setEventId(id);}catch{}
  let timer:ReturnType<typeof setTimeout>;
  const done=()=>{clearTimeout(timer);timer=setTimeout(()=>form.current?.requestSubmit(),800);};
  window.addEventListener('lt:meta-purchase-settled',done);
  timer=setTimeout(()=>form.current?.requestSubmit(),5000);
  return ()=>{clearTimeout(timer);window.removeEventListener('lt:meta-purchase-settled',done);};
 },[]);
 return <form ref={form} method="post" action="/acquisto-completato/torna"><input type="hidden" name="eventId" value={eventId}/><button className="rounded-xl border px-5 py-3" type="submit">Torna al tuo ordine</button></form>;
}
