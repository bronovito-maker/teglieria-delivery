import policy from './meta-catalog-policy.json';
import type { CartItem } from '@/types';
export const catalogPolicy = policy;
export function catalogLandingPath(id:string):string { return `/prodotto/${encodeURIComponent(id)}`; }
export function isCatalogLandingPath(path:string):boolean {
  if(!path.startsWith('/prodotto/'))return false;
  try {const id=decodeURIComponent(path.slice('/prodotto/'.length));return catalogPolicy.some(p=>p.id===id&&!p.configurable) && (path===catalogLandingPath(id)||path===`/prodotto/${id}`);}catch{return false;}
}
export function resolveMetaCatalogItem(item: Pick<CartItem,'productId'|'variant'>): {id:string}|{reason:string} {
 const matches=catalogPolicy.filter(p=>p.productId===item.productId);
 if(!matches.length)return {reason:'PRODUCT_NOT_IN_REVIEWED_CATALOG'};
 if(matches.some(p=>p.configurable))return {reason:'CONFIGURATOR_HAS_NO_FIXED_CATALOG_ITEM'};
 const selected=matches.find(p=>(p.variant??'')===(item.variant??''));
 if(!selected)return {reason:'VARIANT_NOT_IN_REVIEWED_CATALOG'};
 if(!selected.eligible)return {reason:'CATALOG_ITEM_EXCLUDED_PENDING_REVIEW'};
 return {id:selected.id};
}

export function catalogIdFromRouteParam(param:string):string|null {
 try {const id=decodeURIComponent(param);return catalogPolicy.some(p=>p.id===id&&!p.configurable)?id:null;}catch{return null;}
}
