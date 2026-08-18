import MobileTopBar from "@/components/client/MobileTopBar";

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#fff7f5] to-white flex items-center justify-center px-6 pt-16">
      <MobileTopBar />
      <div className="w-full max-w-md rounded-3xl border border-red-100/80 bg-white/90 shadow-[0_20px_45px_rgba(31,38,135,0.1)] p-8 text-center">
        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[#D96A2B]/80 mb-2">
          Modalita offline
        </p>
        <h1 className="text-3xl font-bold text-[#1d1d1f] mb-3">Connessione assente</h1>
        <p className="text-gray-500">
          Al momento non sei connesso. Riapri l&apos;app quando torna la rete per continuare l&apos;ordine.
        </p>
      </div>
    </main>
  );
}
