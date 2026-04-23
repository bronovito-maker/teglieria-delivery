"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ORDER_STATUS_LABELS } from "@/lib/constants";
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
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/rider/login");
      } else {
        await fetchRiderOrders();
        fetch("/api/rider/profile")
          .then((r) => r.ok ? r.json() : null)
          .then((data) => { if (data?.vehicle) setVehicle(data.vehicle); })
          .catch(() => {});
        interval = setInterval(fetchRiderOrders, 10000);
      }
    }

    checkAuth();
    return () => { if (interval) clearInterval(interval); };
  }, [router, supabase]);

  async function fetchRiderOrders() {
    const res = await fetch("/api/rider/ordini");
    if (res.ok) {
      const data = await res.json();
      setOrders(data);
    }
    setLoading(false);
  }

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }

  async function handleStartDelivery(orderId: string) {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "OUT", deliveryStatus: "EN_ROUTE" }
          : o
      )
    );
    setUpdatingOrderId(orderId);

    try {
      const res = await fetch(`/api/ordini/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "OUT",
          deliveryStatus: "EN_ROUTE",
          statusNote: "[RIDER] Partito per la consegna",
        }),
      });

      if (res.ok) {
        showToast("In consegna! Email cliente inviata.");
      } else {
        showToast("Errore aggiornamento stato", "err");
      }
    } catch {
      showToast("Errore di rete", "err");
    } finally {
      setUpdatingOrderId(null);
      fetchRiderOrders();
    }
  }

  async function handleDelivered(orderId: string) {
    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, status: "DELIVERED", deliveryStatus: "DELIVERED" }
          : o
      )
    );
    setUpdatingOrderId(orderId);

    try {
      const res = await fetch(`/api/ordini/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DELIVERED",
          deliveryStatus: "DELIVERED",
          actualTime: new Date().toISOString(),
          statusNote: "[RIDER] Consegna completata",
        }),
      });

      if (res.ok) {
        showToast("Consegnato!");
      } else {
        showToast("Errore aggiornamento stato", "err");
      }
    } catch {
      showToast("Errore di rete", "err");
    } finally {
      setUpdatingOrderId(null);
      fetchRiderOrders();
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/rider/login");
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento...</div>;

  const activeOrders = orders.filter(
    (o) => o.status !== "DELIVERED" && o.status !== "CANCELLED"
  );
  const deliveredOrders = orders.filter((o) => o.status === "DELIVERED");

  return (
    <div className="rider-layout min-h-screen bg-warm-light px-3 pt-3 pb-6 md:px-8 md:pt-5 md:pb-10">
      {scanning && <QRScanner onClose={() => setScanning(false)} />}

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full text-white text-[10px] font-brand font-bold uppercase tracking-widest shadow-xl pointer-events-none ${
            toast.type === "ok" ? "bg-green-500" : "bg-terracotta"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* ── Ultra-compact top bar: single row ── */}
      <header className="flex items-center gap-1.5 mb-3 md:mb-4 reveal active">
        <div className="flex-1 min-w-0">
          <h1 className="text-[1.18rem] md:text-[1.55rem] font-brand font-semibold tracking-tight text-charcoal truncate leading-none">
            Le mie <span className="text-terracotta">Consegne</span>
          </h1>
        </div>

        {/* Map toggle */}
        <button
          onClick={() => setShowMap((v) => !v)}
          className={`w-10 h-10 flex items-center justify-center rounded-full border transition-all ${
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

        {/* QR Scan — icon button in top bar, replaces FAB */}
        <button
          onClick={() => setScanning(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-terracotta text-white shadow-md shadow-terracotta/20 active:scale-90 transition-all"
          aria-label="Scansiona QR ordine"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z" />
          </svg>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-charcoal text-white shadow-md shadow-charcoal/20 active:scale-90 transition-all"
          aria-label="Logout"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3-3l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
      </header>

      {/* Map Panel */}
      {showMap && orders.length > 0 && (
        <div className="mb-3 md:mb-4 reveal active">
          <RiderMapPanel orders={orders} vehicle={vehicle} />
        </div>
      )}

      {/* Order list */}
      <div className="grid gap-2 md:gap-3">
        {orders.length === 0 ? (
          <EmptyState onScan={() => setScanning(true)} />
        ) : (
          <>
            {activeOrders.map((order, idx) => (
              <OrderCard
                key={order.id}
                order={order}
                idx={idx}
                isUpdating={updatingOrderId === order.id}
                onTap={() => router.push(`/rider/ordine/${order.id}`)}
                onStartDelivery={() => handleStartDelivery(order.id)}
                onDelivered={() => handleDelivered(order.id)}
              />
            ))}

            {deliveredOrders.length > 0 && (
              <>
                <p className="text-[9px] font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/30 text-center pt-2">
                  Completati ({deliveredOrders.length})
                </p>
                {deliveredOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/rider/ordine/${order.id}`)}
                    className="opacity-50 flex items-center justify-between px-4 py-3 bg-white/30 rounded-2xl border border-charcoal/5 cursor-pointer active:bg-white/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-brand font-semibold text-sm text-charcoal/70 flex-shrink-0">
                        #{formatOrderCode(order)}
                      </span>
                      <span className="text-[8px] font-brand font-bold uppercase tracking-widest bg-green-50 text-green-600 px-2 py-0.5 rounded-full flex-shrink-0">
                        Consegnato
                      </span>
                      <span className="text-xs text-charcoal/40 font-body italic truncate">{order.customerName}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Guida Operativa — solo quando vuoto */}
      {orders.length === 0 && (
        <div className="mt-4 p-6 md:p-8 bg-charcoal rounded-[2rem] text-white overflow-hidden relative shadow-2xl shadow-charcoal/40">
          <div className="relative z-10">
            <span className="text-[10px] font-brand font-semibold uppercase tracking-[0.4em] text-marigold mb-2 block">
              Guida Operativa
            </span>
            <h3 className="text-lg font-brand font-semibold tracking-tight mb-2">
              Flusso di <span className="text-terracotta">Lavoro.</span>
            </h3>
            <p className="font-body italic text-white/60 text-sm leading-relaxed max-w-md">
              Tocca il pulsante QR in alto a destra per scansionare un ordine e
              iniziare la consegna.
            </p>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-terracotta/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
        </div>
      )}
    </div>
  );
}

// ── Order Card ───────────────────────────────────────────────────────────

type OrderCardProps = {
  order: any;
  idx: number;
  isUpdating: boolean;
  onTap: () => void;
  onStartDelivery: () => void;
  onDelivered: () => void;
};

function OrderCard({
  order,
  idx,
  isUpdating,
  onTap,
  onStartDelivery,
  onDelivered,
}: OrderCardProps) {
  const isOut = order.status === "OUT";
  const isReady = order.status === "READY";
  const isWaiting = !isOut && !isReady;

  const badgeClass = isOut
    ? "bg-terracotta text-white border-terracotta"
    : order.status === "DELIVERED"
    ? "bg-green-50 text-green-600 border-green-100"
    : "bg-marigold/90 text-white border-marigold";

  return (
    <div
      style={{ transitionDelay: `${idx * 40}ms` }}
      className="reveal active bg-white rounded-2xl border border-charcoal/5 shadow-sm overflow-hidden"
    >
      {/* Info row — tappable → detail */}
      <div
        onClick={onTap}
        className="flex items-center gap-3 px-4 py-3.5 cursor-pointer active:bg-warm-light/40 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <p className="font-brand font-semibold text-lg tracking-tight text-charcoal leading-none">
              #{formatOrderCode(order)}
            </p>
            <span
              className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-brand font-semibold uppercase tracking-[0.16em] border ${badgeClass}`}
            >
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
          <p className="font-body italic text-charcoal/60 text-sm truncate leading-tight">
            {order.customerName}
          </p>
          {order.address && (
            <p className="text-[9px] text-charcoal/35 font-brand font-bold uppercase tracking-wide truncate mt-0.5">
              {order.address}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 text-right">
          <p className="font-brand font-semibold text-base text-charcoal leading-none">
            {order.estimatedTime
              ? new Date(order.estimatedTime).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "--:--"}
          </p>
          <svg className="w-3 h-3 text-charcoal/20 ml-auto mt-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="h-px bg-charcoal/5 mx-4" />

      {/* ── Action strip: IN CONSEGNA → Consegnato ── */}
      {isOut && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelivered(); }}
          disabled={isUpdating}
          className="w-full py-4 bg-charcoal text-white font-brand font-semibold uppercase tracking-[0.2em] text-[11px] active:bg-charcoal/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {isUpdating ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Aggiornamento...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              Segna come Consegnato
            </>
          )}
        </button>
      )}

      {/* ── Action strip: PRONTO → Avvia Consegna ── */}
      {isReady && (
        <button
          onClick={(e) => { e.stopPropagation(); onStartDelivery(); }}
          disabled={isUpdating}
          className="w-full py-4 bg-terracotta text-white font-brand font-semibold uppercase tracking-[0.2em] text-[11px] active:bg-terracotta/80 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isUpdating ? (
              <>
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Aggiornamento...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Avvia Consegna
              </>
            )}
          </button>
      )}

      {/* ── Waiting state: kitchen still preparing ── */}
      {isWaiting && (
        <div className="flex items-center justify-center gap-2 py-3 bg-warm-light/60">
          <span className="w-1.5 h-1.5 rounded-full bg-marigold animate-pulse" />
          <p className="text-[9px] font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/40">
            In preparazione — attendi il segnale
          </p>
        </div>
      )}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-12 text-center border border-charcoal/5 shadow-sm">
      <div className="w-14 h-14 bg-warm-light rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-2xl">📦</span>
      </div>
      <p className="font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/60 text-xs mb-1">
        Pianale Vuoto
      </p>
      <p className="font-body italic text-charcoal/40 text-xs mb-5">
        Scansiona un ordine per iniziare.
      </p>
      <button
        onClick={onScan}
        className="inline-flex items-center gap-2 px-6 py-3 bg-terracotta text-white rounded-full text-[10px] font-brand font-semibold uppercase tracking-wide shadow-md shadow-terracotta/20 active:scale-95 transition-all"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3h6v6H3zM15 3h6v6h-6zM3 15h6v6H3z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 15h2v2h-2zM19 15h2v2h-2zM15 19h2v2h-2zM19 19h2v2h-2z"
          />
        </svg>
        Scansiona QR
      </button>
    </div>
  );
}
