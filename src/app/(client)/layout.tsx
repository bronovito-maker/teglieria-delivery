import MobileTopBar from "@/components/client/MobileTopBar";
import ClientToaster from "@/components/client/ClientToaster";
import ClientFooter from "@/components/client/ClientFooter";

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
      <ClientFooter />
    </div>
  );
}
