import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const handle=(request:NextRequest)=>backendProxy(request,'api');
export {handle as GET,handle as POST,handle as PATCH,handle as PUT,handle as DELETE,handle as HEAD,handle as OPTIONS};
