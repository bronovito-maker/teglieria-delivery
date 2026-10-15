// Compatibility surface for the existing UI. All auth is performed by the unified backend.
import type { User, Session, AuthError } from '@/types/auth';
const event = 'lt-auth-changed';
async function call(path: string, method='GET', body?: unknown) {
  try {
    const r=await fetch('/api/'+path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,credentials:'same-origin',cache:'no-store'});
    const data=await r.json(); return {data,error:r.ok?null:{status:r.status,message:typeof data.error==='string'?data.error:'Richiesta non riuscita'}};
  } catch {return {data:null,error:{status:503,message:'Backend non raggiungibile'}};}
}
export function createClient(_options?:{persistSession?:boolean}) {
  return {auth: {
    async getUser() {const r=await call('auth/session');return {data:{user:(r.data?.user??null) as User|null},error:r.error};},
    async getSession() {const r=await call('auth/session');return {data:{session:r.data?.user?{user:r.data.user} as Session:null},error:r.error};},
    async signInWithPassword(input:{email:string;password:string}) {const r=await call('auth/password','POST',input);if(!r.error)window.dispatchEvent(new Event(event));const s=await call('auth/session');return {data:{user:s.data?.user??null,session:s.data?.user?{user:s.data.user}:null},error:r.error};},
    async signUp(input:{email:string;password:string;policy?:unknown;options?:{data?:unknown;emailRedirectTo?:string}}) {const r=await call('auth/register','POST',{email:input.email,password:input.password,data:input.options?.data,policy:input.policy});if(!r.error)window.dispatchEvent(new Event(event));const s=await call('auth/session');return {data:{user:s.data?.user??null,session:s.data?.user?{user:s.data.user}:null},error:r.error};},
    async signOut() {const r=await call('auth/logout','POST',{});window.dispatchEvent(new Event(event));return {error:r.error};},
    async updateUser(input:{data?:unknown}) {const r=await call('auth/profile','PATCH',input);return {data:{user:r.data?.user??null},error:r.error};},
    async signInWithOAuth(input:{provider:string;policy?:unknown;options?:{redirectTo?:string}}) {const r=await call('auth/oauth','POST',input);if(r.data?.url)window.location.assign(r.data.url);return {data:r.data,error:r.error};},
    onAuthStateChange(callback:(name:string,session:Session|null)=>void) {let active=true;const refresh=async()=>{const r=await call('auth/session');if(active)callback('SESSION_UPDATED',r.data?.user?{user:r.data.user}:null)};window.addEventListener(event,refresh);void refresh();return {data:{subscription:{unsubscribe(){active=false;window.removeEventListener(event,refresh)}}}};}
  },storage:{from(_bucket:string){return {
    async upload(path:string,file:File,_options?:unknown){const bytes=new Uint8Array(await file.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));const r=await call('storage/upload','POST',{path,base64:btoa(binary)});return {data:r.data,error:r.error};},
    async remove(paths:string[]){const r=await call('storage/remove','POST',{paths});return {error:r.error};},
    getPublicUrl(path:string){return {data:{publicUrl:'/media/'+path}}}
  }}}};
}
