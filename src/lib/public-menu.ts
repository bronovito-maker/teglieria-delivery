import 'server-only';
import {cache} from 'react';
import type {CategoryWithProducts} from '@/types';
// Anonymous catalog: never vary a public landing page or its metadata by a customer's Club/session.
export const publicMenu = cache(async ():Promise<CategoryWithProducts[]>=>{
 const endpoint=process.env.UNIFIED_BACKEND_URL;if(!endpoint)throw new Error('Catalogo non configurato');
 const r=await fetch(new URL('/web/api/menu',endpoint),{headers:{'x-unified-gateway':process.env.UNIFIED_WEB_GATEWAY_KEY??''},cache:'no-store'});
 if(!r.ok)throw new Error('Catalogo non disponibile');
 const body=await r.json();const categories=Array.isArray(body)?body:body.categories;
 if(!Array.isArray(categories))throw new Error('Catalogo non valido');return categories;
});
