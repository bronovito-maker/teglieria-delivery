"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/constants";
import { formatOrderCode } from "@/lib/utils";
import dynamic from "next/dynamic";

const QRScanner = dynamic(() => import("@/components/rider/QRScanner"), { ssr: false });
const RiderMapPanel = dynamic(() => import("@/components/rider/RiderMapPanel"), { ssr: false });

export default function RiderDashboard() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [vehicle, setVehicle] = useState<"BIKE" | "SCOOTER" | "CAR" | null>(null);
  const [showMap, setShowMap] = useState(true);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/rider/login");
      } else {
        await fetchRiderOrders();
        // Fetch rider profile for vehicle type (used by map)
        fetch("/api/rider/profile")
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.vehicle) setVehicle(data.vehicle); })
          .catch(() => {});
        interval = setInterval(fetchRiderOrders, 10000);
      }
    }

    checkAuth();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [router, supabase]);

  async function fetchRiderOrders() {
    const res = await fetch("/api/rider/ordini");
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
    <div className="min-h-screen bg-warm-light px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-36">
      {scanning && <QRScanner onClose={() => setScanning(false)} />}

      <header className="flex justify-between items-center mb-4 md:mb-6 reveal active">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-display tracking-tight text-charcoal truncate">Le mie <span className="text-terracotta">Consegne.</span></h1>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setShowMap((v) => !v)}
            className={`flex items-center justify-center w-9 h-9 rounded-full border transition-all duration-300 ${
              showMap
                ? "bg-terracotta text-white border-terracotta shadow-md shadow-terracotta/20"
                : "bg-white/60 text-charcoal/40 border-charcoal/10"
            }`}
            aria-label={showMap ? "Nascondi mappa" : "Mostra mappa"}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-charcoal text-white shadow-md shadow-charcoal/20 hover:bg-charcoal/80 transition-all"
            aria-label="Logout"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* Map Panel */}
      {showMap && orders.length > 0 && (
        <div className="mb-4 md:mb-6 reveal active">
          <RiderMapPanel orders={orders} vehicle={vehicle} />
        </div>
      )}

      <div className="grid gap-3 md:gap-5">
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
              style={{ transitionDelay: `${idx * 60}ms` }}
              className="reveal active group bg-white hover:bg-charcoal rounded-2xl md:rounded-[2rem] p-5 md:p-8 flex justify-between items-center border border-charcoal/5 shadow-sm hover:shadow-2xl hover:shadow-charcoal/40 transition-all duration-500 cursor-pointer overflow-hidden relative"
            >
              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-brand font-bold text-xl md:text-3xl tracking-tighter text-charcoal group-hover:text-white transition-colors">#{formatOrderCode(order)}</p>
                  <span className={`inline-block px-2.5 py-1 rounded-full text-[8px] md:text-[9px] font-brand font-bold uppercase tracking-widest border transition-all duration-500 ${
                      order.status === "DELIVERED" ? "bg-green-50 text-green-600 border-green-100" :
                      order.status === "OUT" ? "bg-terracotta text-white border-terracotta group-hover:bg-white group-hover:text-charcoal group-hover:border-white" :
                      "bg-marigold text-white border-marigold"
                  }`}>
                    {ORDER_STATUS_LABELS[order.status] || order.status}
                  </span>
                </div>
                <p className="font-body italic text-charcoal/60 group-hover:text-white/60 text-sm mt-1 transition-colors truncate">{order.customerName}</p>
                <div className="flex items-center gap-2 mt-2">
                   <div className="w-1 h-1 rounded-full bg-terracotta flex-shrink-0" />
                   <p className="text-[9px] text-charcoal/40 group-hover:text-white/40 font-brand font-bold uppercase tracking-widest transition-colors truncate">{order.address || "Ritiro in sede"}</p>
                </div>
              </div>

              <div className="text-right relative z-10 flex-shrink-0 ml-3">
                <p className="text-lg md:text-xl font-brand font-bold text-charcoal group-hover:text-white transition-colors">
                  {order.estimatedTime ? new Date(order.estimatedTime).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "--:--"}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Guida Operativa — only when no orders (onboarding) */}
      {orders.length === 0 && (
        <div className="mt-6 reveal active p-8 md:p-10 bg-charcoal rounded-[2rem] md:rounded-[3rem] text-white overflow-hidden relative shadow-2xl shadow-charcoal/40">
          <div className="relative z-10">
            <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-marigold mb-3 block">Guida Operativa</span>
            <h3 className="text-xl md:text-2xl font-display tracking-tight mb-3">Flusso di <span className="text-terracotta">Lavoro.</span></h3>
            <p className="font-body italic text-white/60 text-sm leading-relaxed max-w-md">
              Quando uno scontrino viene stampato, scansiona il QR code per assegnarti la consegna.
              L&apos;ordine apparirà qui automaticamente e potrai aggiornarne lo stato in tempo reale.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-terracotta/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
        </div>
      )}

      {/* FAB — scan QR, fixed bottom */}
      <div className="fixed bottom-5 inset-x-0 px-4 md:px-6 z-50">
        <button
          onClick={() => setScanning(true)}
          className="relative w-full flex items-center justify-center gap-2.5 py-4 rounded-[999px] bg-gradient-to-br from-[#f17a3c] via-terracotta to-[#c5561a] text-white font-brand font-semibold text-sm shadow-[0_12px_30px_rgba(230,100,40,0.35)] active:scale-[0.97] transition-transform duration-150"
          aria-label="Scansiona QR code"
        >
          <span className="absolute inset-0 rounded-[999px] bg-terracotta/30 animate-ping opacity-30 pointer-events-none" />
          <svg className="w-4.5 h-4.5 relative z-10" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" />
          </svg>
          <span className="relative z-10 uppercase tracking-wide">Scansiona QR ordine</span>
        </button>
      </div>
    </div>
  );
}
