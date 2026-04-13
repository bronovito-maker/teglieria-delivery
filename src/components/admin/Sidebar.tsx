"use client";

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

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
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
  );
}
