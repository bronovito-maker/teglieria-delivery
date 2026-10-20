import {NextRequest,NextResponse} from 'next/server';
import {CONSENT_COOKIE,parseConsent} from '@/lib/cookie-consent';
import {readRegistration,REGISTRATION_COOKIE} from '@/lib/meta-registration-server';
export const dynamic='force-dynamic',runtime='nodejs';
export async function GET(request:NextRequest){
 const proof=await readRegistration(request.cookies.get(REGISTRATION_COOKIE)?.value,parseConsent(request.cookies.get(CONSENT_COOKIE)?.value));
 return proof?NextResponse.json({eventId:proof.eventId},{headers:{'Cache-Control':'private, no-store'}}):new NextResponse(null,{status:204,headers:{'Cache-Control':'private, no-store'}});
}
