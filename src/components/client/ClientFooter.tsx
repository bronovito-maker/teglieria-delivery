"use client";

import Link from "next/link";
import CustomerLogoutButton from "@/components/client/CustomerLogoutButton";
import { useCustomerAuth } from "@/components/client/CustomerAuthProvider";

export default function ClientFooter({ showLogout = true }: { showLogout?: boolean }) {
  const { user, loading } = useCustomerAuth();

  return (
    <footer className="border-t border-charcoal/8 bg-white/60 px-4 py-4 text-center text-sm text-charcoal/55 font-subtitle">
      <p>La Teglieria &copy; {new Date().getFullYear()}</p>
      {showLogout && (loading ? null : user ? (
        <CustomerLogoutButton className="mt-2 rounded-full border border-charcoal/10 px-4 py-2 text-[9px] font-brand font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:border-terracotta/30 hover:text-terracotta disabled:cursor-wait disabled:opacity-50" />
      ) : (
        <Link href="/accedi?next=/menu" className="mt-2 inline-block rounded-full border border-charcoal/10 px-4 py-2 text-[9px] font-brand font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:border-terracotta/30 hover:text-terracotta">
          Accedi
        </Link>
      ))}
    </footer>
  );
}
