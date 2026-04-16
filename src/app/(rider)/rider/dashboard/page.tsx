"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatOrderCode } from "@/lib/utils";
import dynamic from "next/dynamic";

const QRScanner = dynamic(() => import("@/components/rider/QRScanner"), { ssr: false });

export default function RiderDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/rider/login");
      } else {
        setAuthUserId(user.id);
        await fetchRiderOrders(user.id);
        interval = setInterval(() => fetchRiderOrders(user.id), 10000);
      }
    }

    checkAuth();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [router, supabase]);

  async function fetchRiderOrders(authUserId: string) {
    const res = await fetch(`/api/rider/ordini?authUserId=${authUserId}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/rider/login");
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento...</div>;

  return (
    <div className="min-h-screen bg-warm-light p-6 md:p-8 pb-36">
      {scanning && <QRScanner onClose={() => setScanning(false)} />}

      <header className="flex justify-between items-center mb-10 reveal active">
        <div>
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-terracotta/60 mb-1 block">Console</span>
          <h1 className="text-3xl font-display tracking-tight text-charcoal">Le mie <span className="text-terracotta">Consegne.</span></h1>
          <p className="font-body italic text-charcoal/40 text-[10px] mt-1 uppercase tracking-widest">Pronto per il prossimo turno</p>
        </div>
        <button
          onClick={handleLogout}
          className="group flex items-center gap-2 px-6 py-3 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-widest text-[9px] shadow-lg shadow-charcoal/20 hover:bg-charcoal/80 transition-all duration-500"
        >
          Logout
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </button>
      </header>

      <div className="grid gap-6">
        {orders.length === 0 ? (
          <div className="reveal active bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-16 text-center border border-charcoal/5 shadow-sm">
            <div className="w-16 h-16 bg-warm-light rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">📦</span>
            </div>
            <p className="font-brand font-bold uppercase tracking-[0.2em] text-charcoal/60 text-xs mb-2">Pianale Vuoto</p>
            <p className="font-body italic text-charcoal/40 text-xs">Scansiona un ordine per iniziare la consegna.</p>
          </div>
        ) : (
          orders.map((order, idx) => (
            <div 
              key={order.id} 
              onClick={() => router.push(`/rider/ordine/${order.id}`)}
              style={{ transitionDelay: `${idx * 100}ms` }}
              className="reveal active group bg-white hover:bg-charcoal rounded-[2rem] p-8 flex justify-between items-center border border-charcoal/5 shadow-sm hover:shadow-2xl hover:shadow-charcoal/40 transition-all duration-500 cursor-pointer overflow-hidden relative"
            >
              <div className="relative z-10">
                <p className="font-brand font-bold text-3xl tracking-tighter text-charcoal group-hover:text-white transition-colors">#{formatOrderCode(order)}</p>
                <p className="font-body italic text-charcoal/60 group-hover:text-white/60 text-sm mt-1 transition-colors">{order.customerName}</p>
                <div className="flex items-center gap-2 mt-4">
                   <div className="w-1.5 h-1.5 rounded-full bg-terracotta" />
                   <p className="text-[10px] text-charcoal/40 group-hover:text-white/40 font-brand font-bold uppercase tracking-widest transition-colors">{order.address || "Ritiro in sede"}</p>
                </div>
              </div>

              <div className="text-right relative z-10">
                <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest border transition-all duration-500 ${
                    order.status === "consegnato" ? "bg-green-50 text-green-600 border-green-100" :
                    order.status === "in_consegna" ? "bg-terracotta text-white border-terracotta group-hover:bg-white group-hover:text-charcoal group-hover:border-white" :
                    "bg-marigold text-white border-marigold"
                }`}>
                  {ORDER_STATUS_LABELS[order.status] || order.status}
                </span>
                <p className="text-xl font-brand font-bold text-charcoal group-hover:text-white mt-4 transition-colors">
                  {order.estimatedTime ? new Date(order.estimatedTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </p>
              </div>

              {/* Decorative brand element */}
              <div className="absolute -bottom-4 -right-4 text-8xl font-brand font-black text-charcoal opacity-[0.03] group-hover:opacity-[0.05] transition-opacity lowercase leading-none pointer-events-none">
                {formatOrderCode(order)}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-12 reveal active p-10 bg-charcoal rounded-[3rem] text-white overflow-hidden relative shadow-2xl shadow-charcoal/40">
        <div className="relative z-10">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-marigold mb-4 block">Guida Operativa</span>
          <h3 className="text-2xl font-display tracking-tight mb-4">Flusso di <span className="text-terracotta">Lavoro.</span></h3>
          <p className="font-body italic text-white/60 text-sm leading-relaxed max-w-md">
            Quando uno scontrino viene stampato, scansiona il QR code per assegnarti la consegna. 
            L&apos;ordine apparirà qui automaticamente e potrai aggiornarne lo stato in tempo reale.
          </p>
          {authUserId && (
            <div className="flex items-center gap-2 mt-8 py-2 px-4 bg-white/5 w-fit rounded-full">
               <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
               <p className="text-[9px] font-brand font-bold uppercase tracking-widest text-white/40">In ascolto per nuovi ordini...</p>
            </div>
          )}
        </div>
        
        {/* Decorative mask */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
      </div>

      {/* FAB — scan QR, fixed bottom */}
      <div className="fixed bottom-8 inset-x-0 px-6 z-50">
        <button
          onClick={() => setScanning(true)}
          className="relative w-full flex items-center justify-center gap-3 py-5 rounded-[999px] bg-gradient-to-br from-[#f17a3c] via-terracotta to-[#c5561a] text-white font-brand font-semibold text-base shadow-[0_12px_30px_rgba(230,100,40,0.35)] active:scale-[0.97] transition-transform duration-150"
          aria-label="Scansiona QR code"
        >
          {/* Pulse ring */}
          <span className="absolute inset-0 rounded-[999px] bg-terracotta/30 animate-ping opacity-30 pointer-events-none" />
          <svg className="w-5 h-5 relative z-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" />
          </svg>
          <span className="relative z-10 uppercase tracking-wide">Scansiona QR ordine</span>
        </button>
      </div>
    </div>
  );
}
