import {describe,it,expect} from 'vitest';
import {calculatePizzaConfiguration,parsePizzaBuilderSelection} from './pizza-builder';
import {initialGraph} from './allergens/initial-data';
import {pizzaAllergens} from './allergens/core';
const slot={base:'ROSSA' as const,flavor:'La Partenopea',ingredients:[]};
describe('ingredient removal per pizza taste',()=>{
 it('removes a menu ingredient rather than silently reinserting it',()=>{
  const before=calculatePizzaConfiguration({format:'MEZZA',gusti:1,slots:[slot]});
  const after=calculatePizzaConfiguration({format:'MEZZA',gusti:1,slots:[{...slot,removals:['Acciughe']}]});
  expect(after.total).toBeCloseTo(before.total);
  expect(after.additions.some(a=>a.name==='Gusto 1 · Acciughe')).toBe(false);
  expect(after.additions.some(a=>a.name==='Gusto 1 · Senza Acciughe')).toBe(true);
 });
 it('keeps removals separate between different tastes',()=>{
  const v=calculatePizzaConfiguration({format:'INTERA',gusti:2,slots:[{...slot,removals:['Acciughe']},slot]});
  expect(v.additions.some(a=>a.name==='Gusto 2 · Acciughe')).toBe(true);
  expect(v.additions.some(a=>a.name==='Gusto 1 · Acciughe')).toBe(false);
 });
 it('removes standard mozzarella while keeping the selected recipe identity',()=>{
  const v=calculatePizzaConfiguration({format:'MEZZA',gusti:1,slots:[{base:'ROSSA',flavor:'La Regina',ingredients:[],removals:['Mozzarella standard']}]});
  expect(v.total).toBe(16);expect(v.additions.some(a=>a.name==='Gusto 1 · Mozzarella standard')).toBe(false);
 });
 it.each([['Ingrediente inventato'],['Acciughe','Acciughe'],['Guanciale']])('rejects impossible or duplicate removals %j',(...removals)=>{
  expect(()=>parsePizzaBuilderSelection({format:'INTERA',gusti:1,slots:[{...slot,removals}]})).toThrow();
 });
 it('rejects contradictory add/remove of the same ingredient',()=>{
  expect(()=>parsePizzaBuilderSelection({format:'INTERA',gusti:1,slots:[{...slot,ingredients:['Acciughe'],removals:['Acciughe']}]})).toThrow();
 });
 it('keeps allergen display conservative for modified composite recipes',()=>{
  const g=initialGraph([{id:'p',name:'La Partenopea',category:{name:'Teglie'}}]);
  const result=pizzaAllergens(g,{format:'INTERA',gusti:1,slots:[{...slot,removals:['Acciughe']}]});
  expect(result.pending).toContain('Ricetta modificata: verificare allergeni con il personale');
 });
});
