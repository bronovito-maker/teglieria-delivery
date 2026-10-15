import { NextRequest,NextResponse } from 'next/server';
// Presentation-only navigation guards. Backend repeats authorization on every request.
export async function updateSession(request:NextRequest) {
 if(request.nextUrl.pathname.startsWith('/admin')&&!request.nextUrl.pathname.startsWith('/admin/login')) {
  const r=await fetch(`${process.env.UNIFIED_BACKEND_URL??'http://127.0.0.1:28797'}/web/api/admin/session`,{headers:{'x-unified-gateway':process.env.UNIFIED_WEB_GATEWAY_KEY??'',cookie:request.headers.get('cookie')??''},cache:'no-store'}).catch(()=>null);
  if(!r?.ok){const url=request.nextUrl.clone();url.pathname='/admin/login';return NextResponse.redirect(url)}
 }return NextResponse.next({request});
}
