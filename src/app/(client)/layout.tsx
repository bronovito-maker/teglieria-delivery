import Link from "next/link";
import MobileTopBar from "@/components/client/MobileTopBar";
import ClientToaster from "@/components/client/ClientToaster";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-warm-light text-charcoal">
      <MobileTopBar />

      <header className="hidden md:block tomato-glass border-b text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" translate="no" className="text-4xl font-display tracking-tight">
            LA <span className="text-terracotta">TEGLIERIA</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-24 pb-6 md:py-6">
        {children}
      </main>
      <ClientToaster />
      <footer className="border-t border-charcoal/8 bg-white/60 backdrop-blur-sm text-center text-sm text-charcoal/55 py-4 font-subtitle">
        La Teglieria &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
