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
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-xl font-bold text-orange-400">Teglieria</h1>
        <p className="text-xs text-gray-400 mt-1">Gestionale</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === item.href
                ? "bg-orange-600 text-white"
                : "text-gray-300 hover:bg-gray-800"
            )}
          >
            <span>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition-colors"
        >
          <span>🚪</span>
          Esci
        </button>
      </div>
    </aside>
  );
}
