"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/ordini", label: "Ordini", icon: "📋" },
  { href: "/admin/ordini/nuovo", label: "Nuovo Ordine", icon: "➕" },
  { href: "/admin/logistica", label: "Logistica", icon: "🛵" },
  { href: "/admin/prodotti", label: "Prodotti", icon: "🍕" },
  { href: "/admin/categorie", label: "Categorie", icon: "📁" },
  { href: "/admin/report", label: "Report", icon: "📈" },
  { href: "/admin/orari", label: "Orari", icon: "🗓️" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <header className="md:hidden fixed top-0 inset-x-0 z-[80] bg-charcoal border-b border-white/5 text-white">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-logo font-medium uppercase tracking-wider text-white">La Teglieria</h1>
            <p className="text-[10px] font-brand font-bold text-terracotta uppercase tracking-[0.25em]">Gestionale</p>
          </div>
          <button
            type="button"
            aria-label={open ? "Chiudi menu admin" : "Apri menu admin"}
            aria-expanded={open}
            onClick={() => setOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <span className="relative block h-4 w-5">
              <span className={`absolute left-0 top-0 h-[2px] w-5 rounded bg-white transition-all duration-300 ${open ? "top-[7px] rotate-45" : ""}`} />
              <span className={`absolute left-0 top-[7px] h-[2px] w-5 rounded bg-white transition-all duration-300 ${open ? "opacity-0" : "opacity-100"}`} />
              <span className={`absolute left-0 top-[14px] h-[2px] w-5 rounded bg-white transition-all duration-300 ${open ? "top-[7px] -rotate-45" : ""}`} />
            </span>
          </button>
        </div>

        <nav className={`grid transition-all duration-500 ease-in-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
          <div className="overflow-hidden bg-charcoal">
            <div className="px-4 py-6 space-y-2 border-t border-white/5">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-brand font-bold uppercase tracking-widest transition-all",
                    pathname === item.href
                      ? "bg-terracotta text-white shadow-lg shadow-terracotta/20"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  <span className="text-base opacity-80">{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-brand font-bold uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 transition-all mt-4"
              >
                <span className="text-base opacity-60">🚪</span>
                Esci Sessione
              </button>
            </div>
          </div>
        </nav>
      </header>

      <aside className="md:w-16 lg:w-64 xl:w-72 bg-charcoal border-r border-white/5 h-screen flex-col hidden md:flex shadow-2xl relative z-50 transition-all duration-300 shrink-0">
        <div className="p-3 lg:p-6 xl:p-8 mb-2 lg:mb-6 flex items-center justify-center lg:block">
          <span className="text-2xl lg:hidden">🍕</span>
          <div className="hidden lg:block">
            <h1 className="text-xl xl:text-2xl font-logo font-medium uppercase tracking-wider text-white">La Teglieria</h1>
            <p className="text-[10px] font-brand font-bold text-terracotta mt-2 uppercase tracking-[0.3em] leading-none">Console Gestionale</p>
          </div>
        </div>

        <nav className="flex-1 px-2 lg:px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-3.5 rounded-2xl text-[11px] font-brand font-bold uppercase tracking-[0.15em] transition-all group min-h-[44px]",
                pathname === item.href
                  ? "bg-terracotta text-white shadow-xl shadow-terracotta/20"
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <span className={cn("text-xl lg:text-base shrink-0 transition-transform group-hover:scale-110", pathname === item.href ? "opacity-100" : "opacity-60")}>
                {item.icon}
              </span>
              <span className="hidden lg:block truncate">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-2 lg:p-4 mt-auto border-t border-white/5">
          <button
            onClick={handleLogout}
            title="Esci"
            className="w-full flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-3.5 rounded-2xl text-[11px] font-brand font-bold uppercase tracking-[0.2em] text-white/30 hover:text-white hover:bg-white/5 transition-all min-h-[44px]"
          >
            <span className="text-xl lg:text-base opacity-30 shrink-0">🚪</span>
            <span className="hidden lg:block">Esci</span>
          </button>
        </div>
      </aside>
    </>
  );
}
