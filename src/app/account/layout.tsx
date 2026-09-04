import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MobileTopBar from "@/components/client/MobileTopBar";
import ClientFooter from "@/components/client/ClientFooter";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/accedi?next=/account/orders");
  }

  const displayName: string =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    "";

  return (
    <div className="min-h-screen flex flex-col bg-warm-light">
      <MobileTopBar />

      <div className="flex-1 flex flex-col pt-[4.1rem] sm:pt-[4.5rem]">
        {displayName && (
          <div className="max-w-5xl mx-auto w-full px-5 pt-3 pb-1">
            <p className="text-sm text-charcoal/40 font-medium">
              Ciao,{" "}
              <span className="text-charcoal/60 font-semibold">{displayName}</span>
            </p>
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>

      <ClientFooter showLogout={false} />
    </div>
  );
}
