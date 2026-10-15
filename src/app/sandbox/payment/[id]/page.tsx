import {notFound} from 'next/navigation';
import SandboxPayment from './SandboxPayment';
export const dynamic='force-dynamic';
export default function Page({params}:{params:Promise<{id:string}>}) {
 if(process.env.UNIFIED_SANDBOX!=='1')notFound();
 return <SandboxPayment params={params}/>;
}
