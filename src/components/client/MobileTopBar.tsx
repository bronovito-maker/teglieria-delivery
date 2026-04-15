"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const navItems = [
  { label: "Ordina", href: "/#ordina" },
  { label: "Menu", href: "/#menu" },
  { label: "Chi Siamo", href: "/#chi-siamo" },
  { label: "Dicono Di Noi", href: "/#dicono-di-noi" },
  { label: "Contatti", href: "/#contatti" },
];

export default function MobileTopBar() {
  const [open, setOpen] = useState(false);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className="fixed top-0 inset-x-0 z-[70]">
      {/* Topbar strip */}
      <div className="bg-warm-light/90 backdrop-blur-xl border-b border-charcoal/5 shadow-sm">
        <div className="px-5 md:px-10 py-3 flex items-center justify-between max-w-7xl mx-auto">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            translate="no"
            className="text-[1.65rem] leading-none font-logo font-semibold uppercase tracking-[0.08em] text-charcoal"
          >
            La <span className="text-terracotta">Teglieria</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-brand font-semibold text-charcoal/60 hover:text-charcoal transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <Link
            href="/menu?type=DELIVERY"
            className="hidden md:flex items-center px-5 py-2 rounded-full text-sm font-brand font-semibold text-white bg-terracotta hover:bg-terracotta/90 transition-colors"
          >
            Ordina ora
          </Link>

          {/* Mobile hamburger */}
          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/5 active:scale-90 transition-transform"
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
        className={`fixed inset-0 top-0 bg-warm-light flex flex-col transition-all duration-500 ease-[cubic-bezier(0.19,1,0.22,1)] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Overlay topbar row */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-charcoal/5 flex-shrink-0">
          <Link
            href="/"
            onClick={() => setOpen(false)}
            translate="no"
            className="text-[1.65rem] leading-none font-logo font-semibold uppercase tracking-[0.08em] text-charcoal"
          >
            La <span className="text-terracotta">Teglieria</span>
          </Link>

          <button
            type="button"
            aria-label="Chiudi menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/5 active:scale-90 transition-transform"
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
              className={`flex items-center justify-between px-5 py-5 rounded-2xl border border-charcoal/8 text-[1.3rem] leading-none font-brand font-bold uppercase tracking-wider text-charcoal active:bg-terracotta/5 active:text-terracotta transition-all duration-300 ${
                open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: open ? `${80 + idx * 50}ms` : "0ms" }}
            >
              {item.label}
              <span className="text-terracotta/40 text-base">→</span>
            </Link>
          ))}

          <div
            className={`mt-4 flex flex-col gap-3 transition-all duration-300 ${
              open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            style={{ transitionDelay: open ? `${80 + navItems.length * 50}ms` : "0ms" }}
          >
            <Link
              href="/menu?type=DELIVERY"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full px-7 py-[0.85rem] rounded-[999px] text-[1.65rem] leading-none font-brand font-bold uppercase tracking-widest text-white bg-gradient-to-br from-[#f17a3c] via-[#e66a26] to-[#c5561a] shadow-[0_10px_25px_rgba(230,100,40,0.25)] active:scale-95 transition-all"
            >
              Ordina ora
            </Link>
            <Link
              href="/menu?type=ASPORTO"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center w-full px-7 py-[0.85rem] rounded-[999px] text-[1.65rem] leading-none font-brand font-bold uppercase tracking-widest text-charcoal/80 border-2 border-charcoal/35 active:scale-95 transition-all"
            >
              Ritira in sede
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
