import {it,expect} from 'vitest';
import {purchaseItems} from './ga4-commerce';
import {resolveMetaCatalogItem,catalogLandingPath} from './meta-catalog';
it.each([['mt',22],['ti',39]])('Zucca %s retains reviewed GA/Meta commerce identifiers',(suffix,price)=>{
 const productId=`web-pizza-zucca-${suffix}`;
 expect(resolveMetaCatalogItem({productId})).toEqual({id:productId});
 expect(catalogLandingPath(productId)).toBe(`/prodotto/${productId}`);
 const v=purchaseItems({items:[{productId,quantity:1,unitPrice:price}],total:price,deliveryCost:0});
 expect(v?.items[0].item_name).toContain('Pizza Zucca');expect(v?.value).toBe(price);
});
