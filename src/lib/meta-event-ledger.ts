// First-party atomic deduplication only; never contains contacts/order IDs.
const DB='lt_optional_event_ledger_v1',STORE='events',DAYS=90*86400000;
type Row={id:string;at:number};
async function openDB():Promise<IDBDatabase|null>{
 if(typeof indexedDB==='undefined')return null;
 return new Promise(resolve=>{let settled=false;const end=(db:IDBDatabase|null)=>{if(settled){db?.close();return;}settled=true;clearTimeout(timer);resolve(db);};const timer=setTimeout(()=>end(null),500);
  try{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'});};r.onsuccess=()=>end(r.result);r.onerror=()=>end(null);r.onblocked=()=>end(null);}catch{end(null);}
 });
}
function legacyKey(namespace:string){return namespace==='meta:purchase'?'lt_meta_purchases_v1':namespace==='ga4:purchase'?'lt_ga4_purchases_v1':'lt_meta_events_v1';}
function legacyRows(namespace:string):Row[]{const raw=JSON.parse(localStorage.getItem(legacyKey(namespace))||'[]');if(!Array.isArray(raw))throw Error('LEDGER_INVALID');return raw.filter(r=>r&&typeof r.id==='string'&&typeof r.at==='number'&&r.at>Date.now()-DAYS).slice(-255);}
function localId(namespace:string,id:string){return namespace.endsWith(':purchase')?id:namespace+':'+id;}
export async function eventSeen(namespace:string,id:string):Promise<boolean>{
 try{if(legacyRows(namespace).some(r=>r.id===localId(namespace,id)))return true;}catch{}
 const db=await openDB();if(!db)return false;
 return new Promise(resolve=>{try{const t=db.transaction(STORE,'readonly'),r=t.objectStore(STORE).get(namespace+':'+id);r.onsuccess=()=>resolve(!!r.result&&r.result.at>Date.now()-DAYS);r.onerror=()=>resolve(false);t.oncomplete=()=>db.close();t.onabort=()=>{db.close();resolve(false);};}catch{db.close();resolve(false);}});
}
export async function claimEvent(namespace:string,id:string):Promise<boolean>{
 try{if(legacyRows(namespace).some(r=>r.id===localId(namespace,id)))return false;}catch{}
 const db=await openDB();let claimed=false;
 if(db){claimed=await new Promise<boolean>(resolve=>{try{const t=db.transaction(STORE,'readwrite'),store=t.objectStore(STORE),r=store.get(namespace+':'+id);let added=false;r.onsuccess=()=>{if(!r.result||r.result.at<=Date.now()-DAYS){store.put({id:namespace+':'+id,at:Date.now()});added=true;}};const cursor=store.openCursor();cursor.onsuccess=()=>{const c=cursor.result;if(c){if(c.value.at<=Date.now()-DAYS)c.delete();c.continue();}};t.oncomplete=()=>{db.close();resolve(added);};t.onabort=()=>{db.close();resolve(false);};}catch{db.close();resolve(false);}});}
 else {
  if(typeof navigator==='undefined'||!navigator.locks)return false;
  claimed=await navigator.locks.request('lt-'+namespace+'-event-ledger',()=>{try{const rows=legacyRows(namespace),key=localId(namespace,id);if(rows.some(r=>r.id===key))return false;rows.push({id:key,at:Date.now()});localStorage.setItem(legacyKey(namespace),JSON.stringify(rows));return legacyRows(namespace).some(r=>r.id===key);}catch{return false;}});
 }
 if(claimed)try{const rows=legacyRows(namespace),key=localId(namespace,id);if(!rows.some(r=>r.id===key)){rows.push({id:key,at:Date.now()});localStorage.setItem(legacyKey(namespace),JSON.stringify(rows));}}catch{/* IndexedDB has already committed the atomic claim. */}
 return claimed;
}
async function clearEventPrefix(prefix:string){
 if(prefix==='meta:')try{localStorage.removeItem('lt_meta_events_v1');sessionStorage.removeItem('lt_meta_checkout_v1');}catch{}
 const db=await openDB();if(!db)return;
 try{const t=db.transaction(STORE,'readwrite'),r=t.objectStore(STORE).openCursor();r.onsuccess=()=>{const c=r.result;if(c){if(c.key.toString().startsWith(prefix))c.delete();c.continue();}};t.oncomplete=()=>db.close();t.onabort=()=>db.close();}catch{db.close();}
}

export async function clearMetaEvents(){await clearEventPrefix('meta:');}
export async function clearGAEvents(){await clearEventPrefix('ga4:');}
