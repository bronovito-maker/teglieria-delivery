import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const name: string =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    "";

  return (
    <div className="min-h-screen flex flex-col bg-warm-light">
      <header className="sticky top-0 z-40 bg-warm-light/90 backdrop-blur-xl border-b border-charcoal/5">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/" translate="no" className="text-2xl leading-none font-logo text-charcoal shrink-0">
            La <span className="text-terracotta">Teglieria</span>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/account/orders"
              className="px-3 py-1.5 rounded-full text-xs font-semibold text-charcoal/70 hover:text-charcoal hover:bg-charcoal/5 transition-colors"
            >
              I miei ordini
            </Link>
            <Link
              href="/menu"
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-terracotta text-white hover:bg-terracotta/90 transition-colors"
            >
              Menu
            </Link>
          </nav>
        </div>

        {name && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <p className="text-[11px] text-charcoal/40 font-medium">
              Ciao, <span className="text-charcoal/60 font-semibold">{name}</span>
            </p>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="text-center text-[11px] uppercase tracking-[0.2em] font-bold text-charcoal/25 py-6">
        © {new Date().getFullYear()} La Teglieria
      </footer>
    </div>
  );
}
