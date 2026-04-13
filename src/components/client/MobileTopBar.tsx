"use client";

import { useState } from "react";
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

  return (
    <header className="md:hidden fixed top-0 inset-x-0 z-[70]">
      <div className="bg-warm-light/80 backdrop-blur-xl border-b border-charcoal/5 text-charcoal shadow-sm">
        <div className="px-5 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-brand font-bold uppercase tracking-[0.2em] text-charcoal">
            La <span className="text-terracotta">Teglieria.</span>
          </Link>

          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-charcoal/10 bg-charcoal/5 active:scale-90 transition-transform"
          >
            <div className="relative w-5 h-4 flex flex-col justify-between">
              <span
                className={`h-[1.5px] w-full bg-charcoal rounded-full transition-all duration-300 ${
                  open ? "rotate-45 translate-y-[7.25px]" : ""
                }`}
              />
              <span
                className={`h-[1.5px] w-full bg-charcoal rounded-full transition-all duration-300 ${
                   open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`h-[1.5px] w-full bg-charcoal rounded-full transition-all duration-300 ${
                  open ? "-rotate-45 -translate-y-[7.25px]" : ""
                }`}
              />
            </div>
          </button>
        </div>

        <nav
          className={`grid transition-[grid-template-rows,opacity] duration-400 ease-[cubic-bezier(0.19,1,0.22,1)] ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-5 pb-6 pt-2 space-y-3">
              <div className="flex flex-col gap-2">
                {navItems.map((item, idx) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="group flex items-center justify-between px-4 py-3 rounded-2xl bg-charcoal/[0.03] border border-charcoal/[0.05] text-xs font-brand font-bold uppercase tracking-widest text-charcoal active:bg-marigold/10 active:text-terracotta transition-all"
                    style={{ transitionDelay: `${idx * 40}ms` }}
                  >
                    {item.label}
                    <span className="opacity-0 group-active:opacity-100 transition-opacity">→</span>
                  </Link>
                ))}
              </div>
              
              <Link
                href="/menu"
                onClick={() => setOpen(false)}
                className="block w-full text-center py-4 rounded-2xl bg-terracotta text-white text-xs font-brand font-bold uppercase tracking-[0.2em] shadow-lg shadow-terracotta/20 mt-4"
              >
                Ordina Ora
              </Link>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
