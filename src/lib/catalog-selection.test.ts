import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {catalogPolicy,catalogIdFromRouteParam} from './meta-catalog';
import {findCatalogSelection} from './catalog-selection';
import type {CategoryWithProducts} from '@/types';
const data=JSON.parse(readFileSync(new URL('../../../catalog/menu-source.json',import.meta.url),'utf8'));
const categories=data.categories as CategoryWithProducts[];
describe('real published catalog selections',()=>{
 it('all reviewed fixed-price IDs resolve to active actual product/variant and real positive price',()=>{for(const r of catalogPolicy.filter(p=>!p.configurable)){const s=findCatalogSelection(categories,r.id);expect(s, r.id).not.toBeNull();expect(s!.price).toBeGreaterThan(0);expect(s!.id).toBe(r.id);expect(s!.variant?.name??null).toBe(r.variant);}});
 it('unknown ID and variable configurator have no invented fixed-price landing',()=>{expect(findCatalogSelection(categories,'unknown')).toBeNull();expect(findCatalogSelection(categories,catalogPolicy.find(p=>p.configurable)!.id)).toBeNull();});
 it('removing a product from current menu immediately invalidates its landing',()=>{const r=catalogPolicy.find(p=>!p.configurable)!;const missing=categories.map(c=>({...c,products:c.products.filter(p=>p.id!==r.productId)}));expect(findCatalogSelection(missing,r.id)).toBeNull();});
});

it('Next route percent-encoded variant parameter resolves without inventing an ID',()=>{const variant=catalogPolicy.find(p=>p.variant&&!p.configurable)!;expect(catalogIdFromRouteParam(encodeURIComponent(variant.id))).toBe(variant.id);expect(catalogIdFromRouteParam(variant.id)).toBe(variant.id);expect(catalogIdFromRouteParam('%broken')).toBeNull();expect(catalogIdFromRouteParam('PRIVATE')).toBeNull();});
