import {describe,it,expect} from 'vitest';
import {customerStatusHistory} from './order-history';
describe('customer order history',()=>{
 it('collapses acceptance rejection and fulfillment cancellation into one visible state',()=>{
  const history=[{id:'r',status:'RECEIVED'},{id:'reject',status:'CANCELLED'},{id:'cancel',status:'CANCELLED'}];
  expect(customerStatusHistory(history).map(x=>x.id)).toEqual(['r','reject']);
  expect(history).toHaveLength(3);
 });
 it('preserves genuine later changes back to a previous state',()=>{
  expect(customerStatusHistory([{status:'RECEIVED'},{status:'CONFIRMED'},{status:'RECEIVED'}])).toHaveLength(3);
  expect(customerStatusHistory([])).toEqual([]);
 });
});
