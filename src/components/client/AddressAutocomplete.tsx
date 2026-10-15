"use client";
import { useState } from "react";
import GooglePlaceAutocomplete from "@/components/shared/GooglePlaceAutocomplete";
type Props = {value:string;onChange:(value:string)=>void;onCoordinatesChange?:(coordinates:{lat:number;lng:number;address?:string}|null)=>void;required?:boolean;placeholder?:string};
export default function AddressAutocomplete(props:Props) {
 const [enabled,setEnabled]=useState(false);
 if (!enabled) return <div className="rounded-xl border p-4 text-sm"><p>Per cercare l’indirizzo e verificare la zona di consegna usiamo Google: vengono trasmessi l’indirizzo digitato e i dati tecnici della connessione. Non richiediamo la tua posizione GPS.</p><button type="button" className="mt-3 underline" onClick={()=>setEnabled(true)}>Apri ricerca indirizzo con Google</button><p className="mt-2">Puoi scegliere l’asporto senza usare questo servizio.</p></div>;
 return <GooglePlaceAutocomplete {...props} className="client-address-autocomplete" />;
}
