import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import Link from 'next/link';
import {publicMenu} from '@/lib/public-menu';
import {findCatalogSelection} from '@/lib/catalog-selection';
import {catalogIdFromRouteParam,catalogLandingPath} from '@/lib/meta-catalog';
import ProductDetailActions from '@/components/client/ProductDetailActions';
import {formatCurrency} from '@/lib/utils';
export const dynamic='force-dynamic';
type Props={params:Promise<{id:string}>};
async function select(param:string){const id=catalogIdFromRouteParam(param);if(!id)notFound();const selected=findCatalogSelection(await publicMenu(),id);if(!selected)notFound();return selected;}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const s=await select((await params).id);return {title:s.title,description:s.product.description??undefined,alternates:{canonical:catalogLandingPath(s.id)}};
}
export default async function ProductPage({params}:Props){
 const s=await select((await params).id);
 return <article className="mx-auto max-w-2xl py-8">
  <Link href="/menu" className="text-sm underline">Torna al menu</Link>
  <h1 className="mt-6 font-display text-4xl">{s.title}</h1>
  {s.product.imageUrl&&<img src={s.product.imageUrl} alt={s.title} className="mt-6 aspect-square w-full rounded-3xl object-contain"/>}
  <p className="mt-5 leading-relaxed">{s.product.description}</p>
  {s.product.ingredients?.length?<p className="mt-3 text-sm">Ingredienti: {s.product.ingredients.join(', ')}</p>:null}
  <p className="mt-5 text-2xl font-bold text-terracotta">{formatCurrency(s.price)}</p>
  <p className="mt-2 text-sm">Prezzo base. Eventuali aggiunte sono calcolate prima della conferma nel carrello. La prenotazione dipende dalla disponibilità di prodotti e fasce.</p>
  <ProductDetailActions selection={s}/>
 </article>;
}
