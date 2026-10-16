import {describe,it,expect} from 'vitest';
import {purchaseItems,purchaseTotals,catalogLabel} from './ga4-commerce';
import {catalogPolicy} from './meta-catalog';
const fixed=catalogPolicy.find(p=>!p.configurable&&!p.variant)!;
const variant=catalogPolicy.find(p=>p.variant)!;
const line={productId:fixed.productId,quantity:2,unitPrice:12.85,variant:null,notes:'PRIVATE_CANARY',productName:'PRIVATE_CLIENT_INPUT'};
const order={total:27.7,deliveryCost:2,items:[line]};
describe('authoritative GA4 product purchase projection',()=>{
 it('uses exact backend unit price and separates shipping, public catalog labels only',()=>{const p=purchaseItems(order)!;expect(p.value).toBe(25.7);expect(p.shipping).toBe(2);expect(p.items).toEqual([{item_id:fixed.id,item_name:catalogLabel(fixed.id).name,item_category:catalogLabel(fixed.id).category,quantity:2,price:12.85}]);expect(JSON.stringify(p)).not.toContain('PRIVATE_');});
 it('maps real separate variants and generic builder, never free-form flavors',()=>{expect(purchaseItems({total:2,items:[{productId:variant.productId,variant:variant.variant,quantity:1,unitPrice:2}]})).toMatchObject({items:[{item_id:variant.id}]});const custom=catalogPolicy.find(p=>p.configurable)!;expect(purchaseItems({total:25,items:[{productId:custom.productId,variant:'PRIVATE_FREE_TEXT',quantity:1,unitPrice:25}]})).toMatchObject({items:[{item_id:custom.id}]});});
 it.each([{total:27.71},{deliveryCost:3},{deliveryCost:-1},{items:[]},{items:[{...line,productId:'unknown'}]},{items:[{...line,variant:'PRIVATE_UNKNOWN'}]},{items:[{...line,quantity:0}]},{items:[{...line,quantity:1.5}]},{items:[{...line,unitPrice:12.851}]},{items:[{...line,unitPrice:NaN}]}])('inconsistent or unmapped details do not invent purchasable items: %j',patch=>expect(purchaseItems({...order,...patch})).toBeNull());
});

describe('consistent GA revenue basis',()=>{
 it('unknown SKU never changes shipping exclusion or invents an item',()=>{const o={...order,items:[{...line,productId:'new-unknown'}]};expect(purchaseItems(o)).toBeNull();expect(purchaseTotals(o,2770)).toEqual({value:25.7,shipping:2});});
 it.each([undefined,-1,2.001,NaN,100])('invalid delivery amount is not guessed: %s',shipping=>expect(purchaseTotals({type:'DELIVERY',deliveryCost:shipping},2770)).toBeNull());
 it('only explicit pickup may omit delivery field',()=>{expect(purchaseTotals({type:'ASPORTO'},2770)).toEqual({value:27.7,shipping:0});expect(purchaseTotals({},2770)).toBeNull();});
});
