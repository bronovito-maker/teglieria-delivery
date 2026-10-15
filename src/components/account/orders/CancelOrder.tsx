"use client";
import {useEffect,useState} from "react";
import {formatDateTime} from "@/lib/utils";
export default function CancelOrder({order,onCancelled}:{order:{id:string;status:string;pickupTime?:string|Date|null};onCancelled:()=>void}){
 const [now,setNow]=useState(Date.now());const [error,setError]=useState("");const [busy,setBusy]=useState(false);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return ()=>clearInterval(timer)},[]);
 if(["CANCELLED","DELIVERED"].includes(order.status)||!order.pickupTime)return null;
 const deadline=new Date(order.pickupTime).getTime()-30*60000;const allowed=Number.isFinite(deadline)&&now<=deadline;
 async function cancel(){if(!confirm("Vuoi annullare questa prenotazione?"))return;setBusy(true);setError("");try{const r=await fetch(`/api/ordini/${order.id}`,{method:"DELETE"});const d=await r.json();if(!r.ok)throw Error(typeof d.error==="string"?d.error:d.error?.message||"Annullamento non riuscito");onCancelled();}catch(e){setError(e instanceof Error?e.message:"Errore")}finally{setBusy(false)}}
 return <div className="my-4 rounded-xl border border-charcoal/10 p-4"><p className="text-sm">{allowed?`Puoi annullare entro il ${formatDateTime(new Date(deadline))}.`:"Il termine per annullare è trascorso: mancano meno di 30 minuti all’orario prenotato."}</p>{allowed&&<button disabled={busy} onClick={cancel} className="mt-2 rounded-lg border border-red-300 px-4 py-2 text-red-700">{busy?"Annullo…":"Annulla prenotazione"}</button>}{error&&<p role="alert" className="mt-2 text-red-700">{error}</p>}</div>
}
