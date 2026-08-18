"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";

/**
 * Header pubblico volutamente minimale: il riferimento usa il brand come
 * punto di orientamento e il carrello come unica azione persistente.
 */
export default function MobileTopBar() {
  const [hydrated, setHydrated] = useState(false);
  const itemCount = useCartStore((state) => state.getItemCount());
  const total = useCartStore((state) => state.getSubtotal());

  useEffect(() => setHydrated(true), []);

  return (
    <header className="fixed inset-x-0 top-0 z-[70] border-b border-charcoal/5 bg-warm-light/95 backdrop-blur-xl">
      <div className="mx-auto flex h-[4.1rem] max-w-5xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
        <Link
          href="/"
          translate="no"
          aria-label="La Teglieria, home"
          className="shrink-0 font-logo text-[1.35rem] leading-none tracking-[-0.06em] text-charcoal sm:text-[2.35rem]"
        >
          LA <span className="text-terracotta">TEGLIERIA</span>
        </Link>

        <Link
          href="/menu?openCart=1"
          aria-label={hydrated && itemCount > 0 ? `Apri carrello, ${itemCount} articoli` : "Apri carrello"}
          className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] px-3.5 py-2 text-[10px] font-brand font-bold uppercase tracking-[0.12em] text-white shadow-[0_7px_16px_rgba(185,85,33,0.18)] transition-transform active:scale-95 sm:px-4"
        >
          <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2.2} />
          <span className="hidden sm:inline">Carrello</span>
          {hydrated && itemCount > 0 && <span>{formatCurrency(total)}</span>}
          {hydrated && itemCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] text-terracotta">
              {itemCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
