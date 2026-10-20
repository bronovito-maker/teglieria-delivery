import {NextRequest} from 'next/server';
import {backendProxy} from '@/lib/backend-proxy';
import {createClient} from '@/lib/auth/server';
export const dynamic='force-dynamic';export const runtime='nodejs';
async function handle(request:NextRequest,{params}:{params:Promise<{operation:string}>}){
 if(process.env.GROWTH_ACCOUNT_UI_ENABLED!=='1')return new Response(null,{status:404});
 const {operation}=await params;
 const allowed=(operation==='preferences'&&['GET','PUT'].includes(request.method))||(operation==='profile'&&request.method==='GET')||(['link-code','erase-optional'].includes(operation)&&request.method==='POST');
 if(!allowed)return new Response(null,{status:404});
 const auth=await createClient();const {data:{user}}=await auth.auth.getUser();
 if(!user)return Response.json({error:'Accedi al tuo account'},{status:401});
 return backendProxy(request,'api');
}
export {handle as GET,handle as PUT,handle as POST};
