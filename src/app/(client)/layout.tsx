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

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 pt-[5.6rem] pb-8 md:px-6 md:pt-28">
        {children}
      </main>
      <ClientToaster />
      <footer className="border-t border-charcoal/8 bg-white/60 backdrop-blur-sm text-center text-sm text-charcoal/55 py-4 font-subtitle">
        La Teglieria &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
