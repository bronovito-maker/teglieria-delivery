"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import Sidebar from "@/components/admin/Sidebar";
import NewOrderAlert from "@/components/admin/NewOrderAlert";

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
    <div className="admin-layout flex h-[100dvh] overflow-hidden bg-warm-light transition-colors duration-500">
      <Toaster position="top-right" richColors />
      <NewOrderAlert />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-4 pt-[72px] sm:pt-4 sm:p-4 md:p-5 lg:p-8 xl:p-12">
        <div className="mx-auto max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
