'use client';
import {useState} from 'react';
import {useCartStore} from '@/store/cart';
import {useServiceAvailability} from './ServiceAvailabilityNotice';
import ProductModal from './ProductModal';
import type {CatalogSelection} from '@/lib/catalog-selection';
import type {CategoryWithProducts} from '@/types';
import {findCatalogSelection} from '@/lib/catalog-selection';
export default function ProductDetailActions({selection}:{selection:CatalogSelection}) {
 const [current,setCurrent]=useState<CatalogSelection|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const orderType=useCartStore(s=>s.orderType);const service=useServiceAvailability();
 async function open(){
  if(busy)return;setBusy(true);setError('');
  try{
   const r=await fetch(`/api/menu?type=${orderType}`,{cache:'no-store'});if(!r.ok)throw new Error();
   const data=await r.json();const categories:CategoryWithProducts[]=Array.isArray(data)?data:data.categories;
   const resolved=findCatalogSelection(categories,selection.id);if(!resolved)throw new Error();setCurrent(resolved);
  }catch{setError('Prodotto non disponibile. Riprova dal menu.');}finally{setBusy(false);}
 }
 return <>
  <button type="button" disabled={busy||service?.allDisabled===true} onClick={open} className="mt-6 rounded-full bg-terracotta px-6 py-3 font-bold text-white disabled:opacity-50">{busy?'Aggiorno il prodotto…':'Scegli e aggiungi al carrello'}</button>
  {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
  {current&&<ProductModal product={current.product} initialVariant={current.variant?.name} onClose={()=>setCurrent(null)} menuFlavors={[]}/>}
 </>;
}
