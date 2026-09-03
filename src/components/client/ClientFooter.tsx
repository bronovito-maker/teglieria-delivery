"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ClientFooter() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const updateFromUser = () => supabase.auth.getUser().then(({ data: { user } }) => setLoggedIn(Boolean(user)));
    updateFromUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session?.user)));
    window.addEventListener("customer-auth-changed", updateFromUser);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("customer-auth-changed", updateFromUser);
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setLoggedIn(false);
    window.dispatchEvent(new Event("customer-auth-changed"));
    router.refresh();
  }

  return (
    <footer className="border-t border-charcoal/8 bg-white/60 px-4 py-4 text-center text-sm text-charcoal/55 font-subtitle">
      <p>La Teglieria &copy; {new Date().getFullYear()}</p>
      {loggedIn ? (
        <button type="button" onClick={handleLogout} className="mt-2 rounded-full border border-charcoal/10 px-4 py-2 text-[9px] font-brand font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:border-terracotta/30 hover:text-terracotta">
          Esci
        </button>
      ) : (
        <Link href="/accedi?next=/menu" className="mt-2 inline-block rounded-full border border-charcoal/10 px-4 py-2 text-[9px] font-brand font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:border-terracotta/30 hover:text-terracotta">
          Accedi
        </Link>
      )}
    </footer>
  );
}
