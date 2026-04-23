"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Ordina", href: "/#ordina" },
  { label: "Menu", href: "/#menu" },
  { label: "Chi Siamo", href: "/#chi-siamo" },
  { label: "Dicono di Noi", href: "/#dicono-di-noi" },
  { label: "Contatti", href: "/#contatti" },
];

export default function MobileTopBar() {
  const [open, setOpen] = useState(false);
  // null = loading, true = logged-in customer, false = guest
  const [isCustomer, setIsCustomer] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      const role = user?.user_metadata?.role;
      setIsCustomer(user != null && role !== "admin" && role !== "rider");
    });
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="fixed top-0 inset-x-0 z-[70]">
      {/* Topbar strip */}
      <div className="border-b border-white/55 bg-[linear-gradient(180deg,rgba(255,252,246,0.9)_0%,rgba(248,240,228,0.82)_58%,rgba(244,232,216,0.76)_100%)] backdrop-blur-[26px] supports-[backdrop-filter]:bg-[linear-gradient(180deg,rgba(255,252,246,0.84)_0%,rgba(248,240,228,0.74)_58%,rgba(244,232,216,0.68)_100%)] shadow-[0_12px_34px_rgba(217,106,43,0.09),0_8px_24px_rgba(26,26,26,0.06)] before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/80">
        <div className="px-4 md:px-10 py-2.5 md:py-3 flex items-center justify-between max-w-7xl mx-auto">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            translate="no"
            className="flex min-h-[44px] translate-y-[3px] items-center text-[2.52rem] md:text-4xl leading-[0.9] tracking-[-0.035em] font-logo text-charcoal"
          >
            LA <span className="text-terracotta">TEGLIERIA</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-lg leading-none font-display text-charcoal/60 hover:text-charcoal transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop right group */}
          <div className="hidden md:flex items-center gap-5">
            {isCustomer === true && (
              <Link
                href="/account/orders"
                className="text-sm font-semibold text-charcoal/50 hover:text-charcoal transition-colors"
              >
                I miei ordini
              </Link>
            )}
            {isCustomer === false && (
              <Link
                href="/accedi"
                className="text-sm font-semibold text-charcoal/50 hover:text-charcoal transition-colors"
              >
                Accedi
              </Link>
            )}
            <Link
              href="/menu?type=DELIVERY"
              className="flex items-center px-6 py-2 rounded-full text-xl leading-none font-display text-white bg-terracotta hover:bg-terracotta/90 transition-colors"
            >
              Ordina ora
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.92),rgba(255,255,255,0.56))] backdrop-blur-xl shadow-[0_10px_24px_rgba(217,106,43,0.1),0_6px_18px_rgba(26,26,26,0.1)] active:scale-90 transition-transform"
          >
            <div className="relative w-5 h-4 flex flex-col justify-between">
              <span className={`h-[1.5px] w-full bg-charcoal rounded-full transition-all duration-300 ${open ? "rotate-45 translate-y-[7.25px]" : ""}`} />
              <span className={`h-[1.5px] w-full bg-charcoal rounded-full transition-all duration-300 ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`h-[1.5px] w-full bg-charcoal rounded-full transition-all duration-300 ${open ? "-rotate-45 -translate-y-[7.25px]" : ""}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Full-screen overlay */}
      <div
        className={`fixed inset-0 top-0 bg-warm-light flex flex-col transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
      >
        {/* Overlay topbar row */}
        <div className="px-4 py-2.5 flex items-center justify-between border-b border-white/55 bg-[linear-gradient(180deg,rgba(255,252,246,0.9)_0%,rgba(248,240,228,0.82)_58%,rgba(244,232,216,0.76)_100%)] backdrop-blur-[26px] shadow-[0_12px_34px_rgba(217,106,43,0.09),0_8px_24px_rgba(26,26,26,0.06)] flex-shrink-0">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            translate="no"
            className="flex min-h-[44px] translate-y-[3px] items-center text-[2.52rem] leading-[0.9] tracking-[-0.035em] font-logo text-charcoal"
          >
            LA <span className="text-terracotta">TEGLIERIA</span>
          </Link>

          <button
            type="button"
            aria-label="Chiudi menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/65 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.92),rgba(255,255,255,0.56))] backdrop-blur-xl shadow-[0_10px_24px_rgba(217,106,43,0.1),0_6px_18px_rgba(26,26,26,0.1)] active:scale-90 transition-transform"
          >
            <div className="relative w-5 h-4 flex flex-col justify-between">
              <span className="h-[1.5px] w-full bg-charcoal rounded-full rotate-45 translate-y-[7.25px]" />
              <span className="h-[1.5px] w-full bg-charcoal rounded-full opacity-0" />
              <span className="h-[1.5px] w-full bg-charcoal rounded-full -rotate-45 -translate-y-[7.25px]" />
            </div>
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 flex flex-col justify-center px-6 gap-2 pb-8">
          {navItems.map((item, idx) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center justify-between px-5 py-4 rounded-2xl border border-charcoal/8 text-[2rem] leading-none font-display text-charcoal active:bg-terracotta/5 active:text-terracotta transition-all duration-300 ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
                }`}
              style={{ transitionDelay: open ? `${80 + idx * 50}ms` : "0ms" }}
            >
              {item.label}
              <span className="text-terracotta/40 text-base font-brand">→</span>
            </Link>
          ))}

          <div
            className={`mt-4 flex flex-col gap-3 transition-all duration-300 ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
            style={{ transitionDelay: open ? `${80 + navItems.length * 50}ms` : "0ms" }}
          >
            <Link
              href="/menu?type=DELIVERY"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full px-7 py-[0.9rem] rounded-[999px] text-[2rem] leading-none font-display text-white bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] shadow-[0_10px_25px_rgba(230,100,40,0.25)] active:scale-95 transition-all"
            >
              Ordina ora
            </Link>
            <Link
              href="/menu?type=ASPORTO"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full px-7 py-[0.9rem] rounded-[999px] text-[2rem] leading-none font-display text-charcoal/80 border-2 border-charcoal/35 active:scale-95 transition-all"
            >
              Ritira in sede
            </Link>
            {isCustomer === true && (
              <Link
                href="/account/orders"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full px-7 py-[0.9rem] rounded-[999px] text-lg leading-none font-semibold text-charcoal/60 border border-charcoal/15 active:scale-95 transition-all"
              >
                I miei ordini
              </Link>
            )}
            {isCustomer === false && (
              <Link
                href="/accedi"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-full px-7 py-[0.9rem] rounded-[999px] text-lg leading-none font-semibold text-charcoal/60 border border-charcoal/15 active:scale-95 transition-all"
              >
                Accedi
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
