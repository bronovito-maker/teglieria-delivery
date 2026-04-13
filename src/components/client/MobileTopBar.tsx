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
      <div className="tomato-glass border-b text-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight">
            La Teglieria.
          </Link>

          <button
            type="button"
            aria-label={open ? "Chiudi menu" : "Apri menu"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/35 bg-white/10"
          >
            <span className="relative block h-4 w-5">
              <span
                className={`absolute left-0 top-0 h-[2px] w-5 rounded bg-white transition-all ${
                  open ? "top-[7px] rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-[7px] h-[2px] w-5 rounded bg-white transition-all ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 top-[14px] h-[2px] w-5 rounded bg-white transition-all ${
                  open ? "top-[7px] -rotate-45" : ""
                }`}
              />
            </span>
          </button>
        </div>

        <nav
          className={`grid transition-all duration-300 ease-out ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="px-3 pb-3 border-t border-white/20">
              <div className="grid grid-cols-1 gap-2 pt-3">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-white/30 bg-white/12 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>
      </div>
    </header>
  );
}
