import {it,expect} from 'vitest';
import {calculatePizzaConfiguration,calculateAuthoritativePizzaLine,getPizzaMenuFlavor,pizzaRemovableIngredients,previewMenuPrices} from './pizza-builder';
import {getCartItemUnitPrices} from '../store/cart';
import {pizzaAllergens} from './allergens/core';
import {initialGraph} from './allergens/initial-data';
function selection(names:string[],half=false){return {mode:'MENU' as const,format:half?'MEZZA' as const:'INTERA' as const,gusti:names.length,slots:names.map(flavor=>({flavor,base:getPizzaMenuFlavor(flavor)!.base,ingredients:[]}))};}
it.each([
 [['Pizza Zucca'],false,39],
 [['Pizza Zucca','Pizza Zucca','Pizza Zucca','Pizza Zucca'],false,39],
 [['Pizza Zucca','La Regina','La Partenopea','La Contadina'],false,34.5],
 [['Pizza Zucca','Pizza Zucca','La Regina','La Regina'],false,34],
 [['Pizza Zucca','Pizza Zucca'],true,19.5],
 [['Pizza Zucca','La Regina'],true,17],
] as [string[],boolean,number][])('prices %j half=%s at %s', (names,half,expected)=>{
 const s=selection(names,half);const result=calculatePizzaConfiguration(s);
 expect(result.total).toBe(expected);
 expect(getCartItemUnitPrices({unitPrice:0,variantPriceDelta:0,additions:result.additions}).payableUnitPrice).toBe(expected);
 expect(calculateAuthoritativePizzaLine({selection:s,quantity:2,claimedUnitPrice:expected,claimedTotalPrice:expected*2}).totalPriceCents).toBe(Math.round(expected*200));
 expect(()=>calculateAuthoritativePizzaLine({selection:s,quantity:1,claimedUnitPrice:1,claimedTotalPrice:1})).toThrow();
});
it('uses live whole price and keeps other menu formulas unchanged',()=>{const book=structuredClone(previewMenuPrices);book.INTERA['Pizza Zucca']=4000;expect(calculatePizzaConfiguration(selection(['Pizza Zucca']),book).total).toBe(40);expect(calculatePizzaConfiguration(selection(['La Regina','La Partenopea','La Contadina','La Diavola'])).total).toBe(34.3);});
it('does not invent mozzarella or tomato in Zucca and resolves recipe allergens',()=>{
 expect(pizzaRemovableIngredients(selection(['Pizza Zucca']).slots[0])).toEqual([]);
 const result=pizzaAllergens(initialGraph([]),selection(['Pizza Zucca']));expect(result.ids).toContain(1);expect(result.ids).toContain(7);
 expect(()=>calculatePizzaConfiguration({...selection(['Pizza Zucca']),mode:'FREE'})).toThrow();
});

it('charges the Zucca quarter itself 9.75, rather than averaging displayed flavor prices',()=>{const q=calculatePizzaConfiguration(selection(['Pizza Zucca','La Regina','La Partenopea','La Contadina']));expect(q.additions.find(a=>a.name==='Gusto 1 · Pizza Zucca')?.price).toBe(9.75);});
