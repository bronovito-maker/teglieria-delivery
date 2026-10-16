import catalog from './analytics-catalog.json';
import { catalogPolicy } from './meta-catalog';
export function catalogLabel(id:string){return (catalog as Record<string,{name:string;category:string}>)[id];}
export function purchaseItems(order:unknown){
 if(!order||typeof order!=='object')return null;
 const o=order as Record<string,unknown>;
 if(!Array.isArray(o.items)||!o.items.length||o.items.length>100)return null;
 const items=[];let sum=0;
 for(const item of o.items){
  if(!item||typeof item!=='object')return null;
  const p=catalogPolicy.find(p=>p.productId===item.productId&&(p.configurable||(p.variant??'')===(item.variant??'')));
  const q=item.quantity,price=item.unitPrice;
  if(!p||!catalogLabel(p.id)||!Number.isSafeInteger(q)||q<=0||q>10000||typeof price!=='number'||!Number.isFinite(price)||price<0)return null;
  const cents=Math.round(price*100);if(Math.abs(price*100-cents)>.000001||cents>100000000)return null;
  sum+=q*cents;items.push({item_id:p.id,item_name:catalogLabel(p.id).name,item_category:catalogLabel(p.id).category,quantity:q,price:cents/100});
 }
 const total=typeof o.total==='number'?o.total:Number(o.total),delivery=o.deliveryCost??0;
 if(typeof delivery!=='number'||!Number.isFinite(delivery)||delivery<0||Math.abs(delivery*100-Math.round(delivery*100))>.000001||!Number.isFinite(total)||sum+Math.round(delivery*100)!==Math.round(total*100))return null;
 return {items,value:sum/100,shipping:delivery};
}

// GA value consistently excludes shipping, even if a SKU cannot be projected.
export function purchaseTotals(order:unknown,paidCents:number){
 if(!order||typeof order!=='object'||!Number.isSafeInteger(paidCents)||paidCents<=0)return null;
 const o=order as Record<string,unknown>,shipping=o.deliveryCost??(o.type==='ASPORTO'?0:undefined);
 if(typeof shipping!=='number'||!Number.isFinite(shipping)||shipping<0)return null;
 const cents=Math.round(shipping*100);
 if(Math.abs(shipping*100-cents)>.000001||cents>paidCents)return null;
 return {value:(paidCents-cents)/100,shipping:cents/100};
}
