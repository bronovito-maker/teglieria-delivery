"use client";

import { useState } from "react";
import { useCustomerAuth } from "@/components/client/CustomerAuthProvider";

type CustomerLogoutButtonProps = {
  className?: string;
};

export default function CustomerLogoutButton({ className }: CustomerLogoutButtonProps) {
  const { user, loading, logout } = useCustomerAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  if (loading || !user) return null;

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(false);
    const { error } = await logout();
    if (error) {
      setLogoutError(true);
      setLoggingOut(false);
      return;
    }

    // Evita di ricaricare il layout protetto /account: dopo il logout deve
    // essere raggiunta una pagina pubblica, non il redirect automatico al login.
    window.location.replace("/menu");
  }

  return (
    <span className="inline-flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className={className ?? "rounded-full border border-charcoal/10 px-4 py-2 text-[9px] font-brand font-bold uppercase tracking-[0.12em] text-charcoal/55 transition-colors hover:border-terracotta/30 hover:text-terracotta disabled:cursor-wait disabled:opacity-50"}
      >
        {loggingOut ? "Uscita..." : "Esci"}
      </button>
      {logoutError && (
        <span role="alert" className="text-xs text-red-600">
          Impossibile completare l&apos;uscita. Riprova.
        </span>
      )}
    </span>
  );
}
