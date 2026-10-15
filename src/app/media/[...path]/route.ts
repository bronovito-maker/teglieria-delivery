import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export const GET=(request:NextRequest)=>backendProxy(request,'media');
