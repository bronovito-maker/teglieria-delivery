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
  { href: "/admin/prodotti", label: "Prodotti", icon: "🍕" },
  { href: "/admin/categorie", label: "Categorie", icon: "📁" },
  { href: "/admin/report", label: "Report", icon: "📈" },
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
      <header className="md:hidden fixed top-0 inset-x-0 z-[80] tomato-glass border-b text-white">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">La Teglieria</h1>
            <p className="text-[11px] text-white/85 uppercase tracking-[0.18em]">Gestionale</p>
          </div>
          <button
            type="button"
            aria-label={open ? "Chiudi menu admin" : "Apri menu admin"}
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
          <div className="overflow-hidden border-t border-white/20">
            <div className="px-3 py-3 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    pathname === item.href
                      ? "bg-white/20 border border-white/30 text-white"
                      : "text-white/95 hover:bg-white/10"
                  )}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/95 hover:bg-white/10 transition-colors"
              >
                <span>🚪</span>
                Esci
              </button>
            </div>
          </div>
        </nav>
      </header>

      <aside className="w-72 bg-white/70 border-r border-red-100/80 min-h-screen flex-col hidden md:flex backdrop-blur-xl">
        <div className="p-4 border-b border-red-100/80 tomato-glass text-white">
          <h1 className="text-xl font-bold tracking-tight">La Teglieria</h1>
          <p className="text-xs text-white/80 mt-1 uppercase tracking-[0.12em]">Gestionale</p>
        </div>
        <nav className="flex-1 p-3 space-y-1.5">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                pathname === item.href
                  ? "tomato-glass border text-white shadow-[0_8px_18px_rgba(192,38,22,0.2)]"
                  : "text-gray-600 hover:bg-red-50/60 hover:text-[#cf2a1d]"
              )}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-red-100/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-red-50/60 hover:text-[#cf2a1d] transition-colors"
          >
            <span>🚪</span>
            Esci
          </button>
        </div>
      </aside>
    </>
  );
}
