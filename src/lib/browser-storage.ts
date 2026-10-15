// Browser storage is optional: a failed write must never interrupt an accepted order.
function optionalStorage(kind:'localStorage'|'sessionStorage') {
 return {
  getItem(name:string):string|null {try{return globalThis[kind].getItem(name);}catch{return null;}},
  setItem(name:string,value:string):void {try{globalThis[kind].setItem(name,value);}catch{}},
  removeItem(name:string):void {try{globalThis[kind].removeItem(name);}catch{}},
 };
}
export const safeLocalStorage=optionalStorage('localStorage');
export const safeSessionStorage=optionalStorage('sessionStorage');
export function orderTrackingUrl(order:{id:string;statusToken?:string;statusAccessToken?:string}) {
 const token=order.statusToken||order.statusAccessToken;
 return `/stato-ordine/${encodeURIComponent(order.id)}`+(token?`#token=${encodeURIComponent(token)}`:'');
}
