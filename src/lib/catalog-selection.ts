import type {CategoryWithProducts,ProductWithRelations,ProductVariant} from '@/types';
import {catalogPolicy} from './meta-catalog';
import {toCents} from './money';
export type CatalogSelection={product:ProductWithRelations;variant:ProductVariant|null;id:string;price:number;title:string};
export function findCatalogSelection(categories:CategoryWithProducts[],id:string):CatalogSelection|null {
 const rule=catalogPolicy.find(r=>r.id===id&&!r.configurable);if(!rule)return null;
 const p=categories.flatMap(c=>c.products).find(p=>p.id===rule.productId&&p.active!==false&&!p.configuration);if(!p)return null;
 const variant=rule.variant==null?null:p.variants.find(v=>v.id===id&&v.name===rule.variant&&v.active!==false)??null;
 if(rule.variant!==null&&!variant)return null;
 const cents=toCents(p.price)+toCents(variant?.priceDelta??0);if(cents<=0)return null;
 const format=p.category.name==='Teglie'?'Teglia intera':p.category.name==='Mezze teglie'?'Mezza teglia':null;
 const title=variant?`${variant.name} — ${p.name.split(' - ').slice(1).join(' - ')||p.name}`:format?`${p.name} — ${format}`:p.name;
 return {product:p,variant,id,price:cents/100,title};
}
