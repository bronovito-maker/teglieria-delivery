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
    <div className="flex min-h-screen bg-warm-light transition-colors duration-500">
      <Sidebar />
      <main className="flex-1 overflow-auto p-4 pt-32 md:p-10 lg:p-12">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
