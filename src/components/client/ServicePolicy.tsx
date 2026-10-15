"use client";
import Link from "next/link";
export const POLICY_VERSION = "2026-10-14-v1";
export const policyPayload = (accepted: boolean) => ({ adult: accepted, privacyRead: accepted, version: POLICY_VERSION });
export const orderPolicyPayload = (accepted: boolean) => ({ privacyRead: accepted, version: POLICY_VERSION });
export default function ServicePolicy({accepted,onChange,orderOnly=false}:{accepted:boolean;onChange:(value:boolean)=>void;orderOnly?:boolean}) {
  return <section className="my-5 rounded-2xl border border-charcoal/20 bg-white p-5 text-sm text-charcoal">
    <label className="flex gap-3 items-start"><input type="checkbox" checked={accepted} onChange={e=>onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
      <span>{orderOnly ? "Ho letto l’" : "Dichiaro di avere almeno 18 anni e di aver letto l’"}<Link className="underline" href="/privacy" target="_blank">informativa privacy</Link>. {orderOnly ? "I dati necessari vengono usati per ricevere, preparare e consegnare questo ordine e per gli obblighi di legge. Puoi ordinare senza account anche se sei minorenne." : "Richiedo il trattamento dei dati necessari per usare l’account."}</span></label>
    <p className="mt-3">Nessun consenso a pubblicità o profilazione. {orderOnly ? "Non ti chiediamo di dichiarare di avere 18 anni. La presa visione dell’informativa non è un consenso al marketing." : "Se non confermi, puoi consultare il menu e ordinare senza account."}</p>
  </section>;
}
