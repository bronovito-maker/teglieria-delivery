import Link from "next/link";
import MobileTopBar from "@/components/client/MobileTopBar";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <MobileTopBar />

      <header className="hidden md:block tomato-glass border-b text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" translate="no" className="text-4xl font-logo">
            La <span className="text-terracotta">Teglieria</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-24 pb-6 md:py-6">
        {children}
      </main>
      <footer className="bg-gray-100 text-center text-sm text-gray-500 py-4 font-subtitle">
        La Teglieria &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
