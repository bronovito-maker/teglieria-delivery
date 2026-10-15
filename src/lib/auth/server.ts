import { cookies } from 'next/headers';
import type { User } from '@/types/auth';
export async function backendFetch(path:string) {
 const jar=await cookies();return fetch(`${process.env.UNIFIED_BACKEND_URL??'http://127.0.0.1:28797'}/web/api/${path}`,{headers:{'x-unified-gateway':process.env.UNIFIED_WEB_GATEWAY_KEY??'',cookie:jar.toString()},cache:'no-store'});
}
export async function createClient() {return {auth:{async getUser(){try{const r=await backendFetch('auth/session');const v=await r.json();return {data:{user:(v.user??null) as User|null},error:null}}catch{return {data:{user:null},error:{message:'Backend non raggiungibile'}}}}}};}
