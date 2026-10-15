import { backendFetch } from '@/lib/auth/server';
import {MenuInitialDataProvider,type InitialMenuData} from '@/components/client/MenuInitialData';
export default async function MenuLayout({children}:{children:React.ReactNode}) {
 const response=await backendFetch('menu');if(!response.ok)throw new Error('Catalogo backend non disponibile');
 const payload=await response.json() as InitialMenuData;return <MenuInitialDataProvider data={payload}>{children}</MenuInitialDataProvider>;
}
