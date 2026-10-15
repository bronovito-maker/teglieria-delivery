import { cookies } from 'next/headers';
import { CONSENT_COOKIE, parseConsent } from '@/lib/cookie-consent';
import { publicReceipts } from '@/lib/meta-purchase-server';
import PurchaseReturn from '@/components/client/PurchaseReturn';
export const dynamic='force-dynamic';
export const metadata={title:'Pagamento confermato',robots:{index:false,follow:false}};
export default async function Page(){
 const jar=await cookies(),receipts=await publicReceipts(jar.getAll(),parseConsent(jar.get(CONSENT_COOKIE)?.value));
 return <main className="mx-auto max-w-xl px-6 py-20 text-center"><h1 className="font-display text-3xl">{receipts.length ? "Pagamento confermato" : "Torna al sito"}</h1><p className="my-6">Torniamo alla pagina del tuo ordine.</p><PurchaseReturn fallback={receipts[0]?.eventId??''}/></main>;
}
