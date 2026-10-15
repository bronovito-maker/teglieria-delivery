"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart, UserRound } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { useServiceAvailability } from "@/components/client/ServiceAvailabilityNotice";

/** Navigazione sempre accessibile per account e carrello. */
export default function MobileTopBar() {
  const [hydrated, setHydrated] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const total = useCartStore((state) => state.getSubtotal());
  const services = useServiceAvailability();

  useEffect(() => {
    setHydrated(true);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-[70] border-b border-charcoal/5 bg-warm-light/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.1rem] max-w-5xl items-center justify-between gap-2 px-4 sm:h-[4.5rem] sm:gap-3 sm:px-6">
        <Link
          href="/"
          translate="no"
          aria-label="La Teglieria, home"
          className="shrink-0 font-logo text-[1.35rem] leading-none tracking-[-0.06em] text-charcoal sm:text-[2.35rem]"
        >
          LA <span className="text-terracotta">TEGLIERIA</span>
        </Link>

        <Link
          href="/account/orders"
          aria-label="Account e i miei ordini"
          className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-terracotta/25 bg-white px-3 py-2 text-[10px] font-brand font-bold uppercase tracking-[0.08em] text-terracotta transition-colors hover:bg-terracotta/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta sm:gap-2 sm:px-4"
        >
          <UserRound className="h-3.5 w-3.5" strokeWidth={2.2} aria-hidden="true" />
          <span>Account</span>
        </Link>

        {services?.allDisabled ? (
          <Link
            href="/menu"
            className="inline-flex min-h-10 items-center rounded-full border border-charcoal/10 bg-white px-4 text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal"
          >
            Menu
          </Link>
        ) : <Link
          href="/menu?openCart=1"
          aria-label={hydrated && itemCount > 0 ? `Apri carrello, ${itemCount} articoli` : "Apri carrello"}
          className="relative inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] px-3.5 py-2 text-[10px] font-brand font-bold uppercase tracking-[0.12em] text-white shadow-[0_7px_16px_rgba(185,85,33,0.18)] transition-transform active:scale-95 sm:px-4"
        >
          <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span className="hidden sm:inline">Carrello</span>
          {hydrated && itemCount > 0 && <span className="hidden sm:inline">{formatCurrency(total)}</span>}
          {hydrated && itemCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] text-terracotta sm:static">
              {itemCount}
            </span>
          )}
        </Link>}
      </div>
    </header>
  );
}
