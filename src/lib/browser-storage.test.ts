import {afterEach,describe,it,expect,vi} from 'vitest';
import {useCartStore} from '../store/cart';
import {safeLocalStorage,safeSessionStorage,orderTrackingUrl} from './browser-storage';
afterEach(()=>vi.unstubAllGlobals());
describe('accepted orders survive unavailable browser storage',()=>{
 for(const [name,storage] of [['localStorage',safeLocalStorage],['sessionStorage',safeSessionStorage]] as const){
  it(name+' denial does not throw',()=>{vi.stubGlobal(name,{getItem(){throw new Error('blocked')},setItem(){throw new Error('quota')},removeItem(){throw new Error('blocked')}});expect(storage.getItem('x')).toBeNull();expect(()=>storage.setItem('x','y')).not.toThrow();expect(()=>storage.removeItem('x')).not.toThrow();});
 }
 it('clearing a completed order cart survives quota errors',()=>{vi.stubGlobal('localStorage',{setItem(){throw new Error('quota')},getItem(){return null},removeItem(){}});expect(()=>useCartStore.getState().clearCart()).not.toThrow();expect(useCartStore.getState().items).toEqual([]);});
 it('cash tracking carries the backend token in the fragment even without cookies',()=>{expect(orderTrackingUrl({id:'abc',statusToken:'secret/value'})).toBe('/stato-ordine/abc#token=secret%2Fvalue');});
});
