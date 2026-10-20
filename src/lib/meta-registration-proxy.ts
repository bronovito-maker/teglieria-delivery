import {NextRequest,NextResponse} from 'next/server';
import {backendProxy} from './backend-proxy';
import {CONSENT_COOKIE,parseConsent} from './cookie-consent';
import {REGISTRATION_COOKIE,registrationTicket} from './meta-registration-server';
import {cookieOptions} from './meta-purchase-server';
export async function registrationProxy(request:NextRequest){
 const upstream=await backendProxy(request,'api');const eventId=upstream.headers.get('x-teglieria-registration');upstream.headers.delete('x-teglieria-registration');
 if(!eventId||!((upstream.status>=200&&upstream.status<300)||upstream.status===303))return upstream;
 const consent=parseConsent(request.cookies.get(CONSENT_COOKIE)?.value);if(!consent?.marketing||!consent.adult)return upstream;
 try{const ticket=await registrationTicket(eventId,consent);const result=new NextResponse(upstream.body,{status:upstream.status,headers:upstream.headers});result.cookies.set(REGISTRATION_COOKIE,ticket,cookieOptions(request,600));return result;}catch{return upstream;}
}
