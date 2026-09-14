import { createClient } from "@/lib/supabase/server";
import { getMenuData } from "@/lib/menu-data";
import { MenuInitialDataProvider, type InitialMenuData } from "@/components/client/MenuInitialData";

export default async function MenuLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const payload = JSON.parse(JSON.stringify(await getMenuData(user))) as InitialMenuData;
  return <MenuInitialDataProvider data={payload}>{children}</MenuInitialDataProvider>;
}
