// Customer-only form/session contract. Native staff login is intentionally separate.
export const NEW_PASSWORD_MIN = 12;
export const NEW_PASSWORD_MAX_BYTES = 1024;
export function newPasswordProblem(value:string):string|null {
 const characters=Array.from(value);
 if(characters.length<NEW_PASSWORD_MIN)return 'Usa una password di almeno 12 caratteri.';
 if(new TextEncoder().encode(value).length>NEW_PASSWORD_MAX_BYTES)return 'La password è troppo lunga. Usa una frase più breve.';
 if(!/\P{White_Space}/u.test(value)||characters.every(c=>c===characters[0]))return 'Usa una frase o caratteri diversi: evita password composte da un solo carattere ripetuto.';
 return null;
}
export function sanitizeCustomerNext(value:string|null|undefined):string {
 if(!value||!value.startsWith('/')||value.startsWith('//')||/[\\\x00-\x20]/.test(value))return '/menu';
 try {
  const target=new URL(value,'https://local.invalid');
  if(target.origin!=='https://local.invalid'||!(['/menu','/ordine','/account'].includes(target.pathname)||target.pathname.startsWith('/account/')))return '/menu';
  return target.pathname+target.search;
 }catch{return '/menu';}
}
export function orderReturnPath(date:string,time:string):string {
 const q=new URLSearchParams();
 if(/^\d{4}-\d{2}-\d{2}$/.test(date))q.set('date',date);
 if(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))q.set('time',time);
 return '/ordine'+(q.size?'?'+q.toString():'');
}
export function duplicateRegistration(status:number,message=''):boolean {
 return status===409||(status===422&&/already (?:been )?registered|email già registrata/i.test(message));
}
export function customerAuthFailure(status:number,mode:'login'|'register',serverMessage='',retryAfter?:string|null):string {
 if(status===429){const seconds=Number(retryAfter);return Number.isInteger(seconds)&&seconds>0&&seconds<=3600?`Troppi tentativi ravvicinati. Attendi ${seconds} secondi e riprova.`:'Accesso temporaneamente occupato o troppi tentativi. Attendi un minuto e riprova.';}
 if(status>=500||status===0)return 'Servizio temporaneamente non disponibile o connessione interrotta. Riprova tra poco: non significa che la password sia errata.';
 if(status===401)return 'Email o password non validi. Controlla i dati. Se hai creato l’account con Google, usa «Continua con Google».';
 if(mode==='register'&&duplicateRegistration(status,serverMessage))return 'Questa email ha già un account. Accedi con la password scelta oppure usa Google se avevi creato l’account con Google.';
 if(status===400&&/almeno 12|password non valid|password di/i.test(serverMessage))return 'Usa una password di almeno 12 caratteri, non composta da un solo carattere ripetuto.';
 if(status===400&&/informativa|maggior|18 anni/i.test(serverMessage))return 'Conferma la dichiarazione per usare l’account e la lettura dell’informativa, poi riprova.';
 if(status===403)return 'Richiesta di accesso non consentita. Riapri il sito e riprova.';
 return mode==='register'?'Registrazione non completata. Controlla i campi e riprova.':'Accesso non completato. Controlla i campi e riprova.';
}
async function boundedJson(url:string,init:RequestInit,timeoutMs:number) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{const response=await fetch(url,{...init,signal:controller.signal});const body=await response.json().catch(()=>null);return {response,body};}finally{clearTimeout(timer);}
}
export async function postCustomerAuth(mode:'login'|'register',payload:unknown) {
 const {response,body}=await boundedJson('/api/auth/'+(mode==='register'?'register':'password'),{method:'POST',credentials:'same-origin',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)},15000);
 const message=typeof body?.error==='string'?body.error:'';
 const status=response.ok&&body?.ok!==true?502:response.status;
 return {ok:response.ok&&body?.ok===true,status,message:customerAuthFailure(status,mode,message,response.headers.get('retry-after')),duplicate:mode==='register'&&duplicateRegistration(status,message)};
}
export function isCustomerSession(value:unknown):boolean {
 if(!value||typeof value!=='object')return false;
 const data=value as {authenticated?:unknown;user?:{id?:unknown;app_metadata?:{role?:unknown}}};
 return data.authenticated===true&&typeof data.user?.id==='string'&&data.user.id.length>0&&data.user.app_metadata?.role==='customer';
}
export async function waitForCustomerSession(attempts=4):Promise<boolean> {
 for(let attempt=0;attempt<attempts;attempt++){
  try{const {response,body}=await boundedJson('/api/auth/session',{credentials:'same-origin',cache:'no-store'},4000);if(response.ok&&isCustomerSession(body))return true;}catch{/* Bounded retry for cookie propagation/network failure. */}
  if(attempt+1<attempts)await new Promise(resolve=>setTimeout(resolve,75*(attempt+1)));
 }
 return false;
}

// The existing Google callback lands on /menu. Keep only the same-tab return
// intent, never credentials; consume it only after customer authentication.
const GOOGLE_RETURN_KEY='lt_customer_google_return';
export function clearGoogleReturn():void {try{sessionStorage.removeItem(GOOGLE_RETURN_KEY);}catch{}}
export function rememberGoogleReturn(value:string,now=Date.now()):void {
 const next=sanitizeCustomerNext(value);clearGoogleReturn();if(next==='/menu')return;
 try{sessionStorage.setItem(GOOGLE_RETURN_KEY,JSON.stringify({next,expiresAt:now+600000}));}catch{/* Login still works without optional browser storage. */}
}
export function consumeGoogleReturn(now=Date.now()):string|null {
 try{
  const raw=sessionStorage.getItem(GOOGLE_RETURN_KEY);clearGoogleReturn();if(!raw)return null;
  const saved=JSON.parse(raw);
  if(typeof saved.next!=='string'||!Number.isSafeInteger(saved.expiresAt)||saved.expiresAt<=now||saved.expiresAt>now+600000)return null;
  const next=sanitizeCustomerNext(saved.next);return next==='/menu'?null:next;
 }catch{return null;}
}
