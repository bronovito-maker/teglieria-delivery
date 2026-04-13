"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-white via-[#fff7f5] to-white">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 md:p-6">
        <div className="mx-auto max-w-[1400px]">{children}</div>
      </main>
    </div>
  );
}
