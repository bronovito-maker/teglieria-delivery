"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { cn, formatCurrency, formatTime } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

const KANBAN_COLUMNS = ["RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT", "DELIVERED"];

const STATUS_BADGE_STYLES: Record<string, string> = {
  RECEIVED: "bg-marigold/10 text-marigold border-marigold/20",
  CONFIRMED: "bg-marigold/5 text-marigold border-marigold/10",
  PREPARING: "bg-terracotta/10 text-terracotta border-terracotta/20",
  READY: "bg-terracotta/5 text-terracotta border-terracotta/10",
  OUT: "bg-charcoal text-white border-charcoal",
  DELIVERED: "bg-charcoal/10 text-charcoal/40 border-charcoal/10",
  CANCELLED: "bg-charcoal text-white border-charcoal",
};

function getStatusBadgeClass(status: string) {
  return STATUS_BADGE_STYLES[status] ?? "bg-charcoal/5 text-charcoal/40 border-charcoal/10";
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [confirmingOrder, setConfirmingOrder] = useState<OrderWithItems | null>(null);
  const [etaMinutes, setEtaMinutes] = useState(30);
  const [confirmingLoading, setConfirmingLoading] = useState(false);
  const prevCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchOrders = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/ordini?date=${today}`);
    const data = await res.json();
    setOrders(data);

    // Play sound on new order
    if (prevCountRef.current > 0 && data.length > prevCountRef.current) {
      audioRef.current?.play().catch(() => {});
    }
    prevCountRef.current = data.length;
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/ordini/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  }

  function openConfirmModal(order: OrderWithItems) {
    const defaultEta = 30;
    if (order.estimatedTime) {
      const diffMinutes = Math.round(
        (new Date(order.estimatedTime).getTime() - Date.now()) / 60000
      );
      setEtaMinutes(Math.max(5, diffMinutes));
    } else {
      setEtaMinutes(defaultEta);
    }
    setConfirmingOrder(order);
  }

  function closeConfirmModal() {
    setConfirmingOrder(null);
    setEtaMinutes(30);
    setConfirmingLoading(false);
  }

  function adjustEtaMinutes(delta: number) {
    setEtaMinutes((prev) => Math.max(5, Math.min(120, prev + delta)));
  }

  async function confirmIncomingOrder() {
    if (!confirmingOrder) return;
    setConfirmingLoading(true);
    const estimatedTime = new Date(Date.now() + etaMinutes * 60000).toISOString();

    await fetch(`/api/ordini/${confirmingOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "CONFIRMED",
        estimatedTime,
      }),
    });

    closeConfirmModal();
    fetchOrders();
  }

  function printOrder(orderId: string) {
    const printWindow = window.open(`/api/ordini/${orderId}/stampa`, "_blank", "width=420,height=700");
    printWindow?.addEventListener("load", () => {
      printWindow.print();
    });
  }

  const activeOrders = orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;
  const preparingOrders = orders.filter((o) => o.status === "PREPARING" || o.status === "READY").length;
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.total), 0);
  const avgTicket = orders.length ? totalRevenue / orders.length : 0;
  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="pb-20">
      {/* Hidden audio for notification */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jj4+Lh4J/fH5+goaIiYiGgoB9fH1/goaIioqIhoJ/fHx+gYWIioqIhoJ+fHx+gYWIioqIhoN+fHt9gIWIiomHhIF+fHx+gYWHiYiHhYJ/fXx9f4KFh4iHhYOAfnx8foCDhoiHhoSBf319foGEhoeGhYOBf359f4GEhoaGhIKAf359foCDhYaFhIOBf35+foCChYWFhIOBf359foGDhIWEg4KAf35+foCChIWEg4KAf35+fn+ChISEg4F/fn5+f4GDhISDgoB/fn1+f4GDg4ODgYB/fn5+f4GCg4OCgYB/fn5+f4GCg4OCgYB/fn5+foGCgoKBgH9/fn5+f4GCgoKBgH9+fn5+f4GBgoGAgH9+fn5+f4GBgYGAgH9+fn5/f4CBAAAAAIAAAACAf4B/gH+Af4B/gICAgICAgICAgICAgA==" type="audio/wav" />
      </audio>

      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-4 block">
            Monitoraggio Operativo
          </span>
          <h1 className="text-4xl md:text-5xl font-brand font-medium uppercase tracking-tight text-charcoal">
            Overview <span className="text-terracotta">Ordini.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-4 tracking-widest uppercase text-xs">Live Update • {today}</p>
        </div>
        
        <div className="flex gap-4">
           <button
              onClick={fetchOrders}
              className="px-8 py-4 rounded-full border border-charcoal/10 bg-white shadow-sm text-charcoal font-brand font-bold uppercase tracking-widest text-[10px] hover:bg-charcoal hover:text-white transition-all active:scale-95"
            >
              Aggiorna Dati
            </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {[
          { label: "Ordini Oggi", value: orders.length, accent: "charcoal" },
          { label: "Attivi", value: activeOrders, accent: "terracotta" },
          { label: "In Cucina", value: preparingOrders, accent: "marigold" },
          { label: "Fatturato", value: formatCurrency(totalRevenue), accent: "charcoal" },
        ].map((stat, i) => (
          <div key={i} className="bg-white/50 backdrop-blur-md rounded-[2rem] border border-charcoal/5 p-8 shadow-sm">
            <p className="text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 mb-4">{stat.label}</p>
            <p className={cn("text-3xl font-brand font-medium tracking-tight", stat.accent === "terracotta" ? "text-terracotta" : stat.accent === "marigold" ? "text-marigold" : "text-charcoal")}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-6">
        {KANBAN_COLUMNS.map((status) => {
          const columnOrders = orders.filter((o) => o.status === status);
          return (
            <div key={status} className="flex flex-col min-w-[280px]">
              <div className="flex items-center justify-between px-2 mb-6">
                <span className={`px-4 py-1.5 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest shadow-sm ${getStatusBadgeClass(status)}`}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <span className="text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/20">{columnOrders.length}</span>
              </div>
              
              <div className={cn("flex-1 space-y-4 min-h-[500px] rounded-[2.5rem] p-4 bg-white/30 border border-charcoal/5 transition-colors", columnOrders.length > 0 ? "bg-white/30" : "bg-transparent border-dashed")}>
                {columnOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-[2rem] shadow-sm p-6 border border-charcoal/5 hover:shadow-xl hover:scale-[1.02] transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4 border-b border-charcoal/5 pb-4">
                      <span className="font-brand font-bold text-charcoal text-lg">#{order.orderNumber}</span>
                      <span className="text-[10px] font-body text-charcoal/30 italic">{formatTime(order.createdAt)}</span>
                    </div>
                    
                    <div className="mb-6 space-y-1">
                      <p className="text-sm font-brand font-bold text-charcoal uppercase tracking-tight">{order.customerName}</p>
                      <p className="text-[10px] font-body text-charcoal/40 italic flex items-center gap-2">
                        <span className="w-1 h-1 rounded-full bg-charcoal/20" />
                        {order.type === "ASPORTO" ? "Ritiro Sede" : "Consegna"}
                      </p>
                      {order.type === "DELIVERY" && order.address && (
                        <p className="text-[10px] font-body text-charcoal/60 truncate mt-1">📍 {order.address}</p>
                      )}
                    </div>

                    <div className="space-y-2 mb-6">
                      {order.items.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex justify-between items-center text-[10px]">
                          <span className="text-charcoal/60"><span className="text-terracotta mr-1">{item.quantity}×</span> {item.productName}</span>
                        </div>
                      ))}
                      {order.items.length > 3 && <p className="text-[9px] text-charcoal/20 uppercase tracking-widest font-brand">+ {order.items.length - 3} altri prodotti</p>}
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-charcoal/5">
                      <span className="font-brand font-bold text-charcoal">{formatCurrency(Number(order.total))}</span>
                      <div className="flex gap-2">
                        {status === "RECEIVED" ? (
                          <button
                            onClick={() => openConfirmModal(order)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-charcoal text-white hover:bg-terracotta transition-colors shadow-lg shadow-charcoal/10"
                            title="Conferma Ordine"
                          >
                            ✓
                          </button>
                        ) : (
                          ORDER_STATUS_TRANSITIONS[status]?.map((nextStatus) => (
                            <button
                              key={nextStatus}
                              onClick={() => updateStatus(order.id, nextStatus)}
                              className={cn(
                                "h-10 px-4 rounded-xl font-brand font-bold text-[9px] uppercase tracking-widest transition-all",
                                nextStatus === "CANCELLED" 
                                  ? "bg-red-50 text-red-500 hover:bg-red-500 hover:text-white" 
                                  : "bg-charcoal/5 text-charcoal hover:bg-charcoal hover:text-white"
                              )}
                            >
                              {ORDER_STATUS_LABELS[nextStatus]}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {columnOrders.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-charcoal/5">
                    <span className="text-4xl mb-4 opacity-50">○</span>
                    <p className="text-[10px] font-brand font-bold uppercase tracking-widest opacity-30">Vuoto</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {confirmingOrder && (
        <div className="fixed inset-0 z-[100] bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-xl bg-warm-light rounded-[3rem] p-10 shadow-2xl border border-white/20">
            <div className="flex justify-between items-start mb-10">
              <div>
                <span className="text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-terracotta mb-2 block">Confirm Order</span>
                <h3 className="text-3xl font-brand font-medium text-charcoal uppercase tracking-tight">Ordine #{confirmingOrder.orderNumber}</h3>
              </div>
              <button
                onClick={closeConfirmModal}
                className="w-12 h-12 rounded-2xl bg-white border border-charcoal/5 text-charcoal hover:bg-charcoal hover:text-white transition-all flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-8 mb-12">
               <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white/50 p-6 rounded-3xl border border-charcoal/5">
                    <p className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 mb-2">Cliente</p>
                    <p className="font-brand font-bold text-charcoal text-sm">{confirmingOrder.customerName}</p>
                    <p className="text-xs font-body italic text-charcoal/50">{confirmingOrder.customerPhone}</p>
                  </div>
                  <div className="bg-white/50 p-6 rounded-3xl border border-charcoal/5">
                    <p className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 mb-2">Indirizzo</p>
                    <p className="font-brand font-bold text-charcoal text-sm truncate">{confirmingOrder.address || "Ritiro Sede"}</p>
                    <p className="text-xs font-body italic text-charcoal/50 uppercase tracking-widest">{confirmingOrder.type}</p>
                  </div>
               </div>

               <div className="bg-white/50 p-8 rounded-3xl border border-charcoal/5">
                  <p className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 mb-6">Tempo Stimato (Minuti)</p>
                  <div className="flex items-center gap-6">
                    <button
                      type="button"
                      onClick={() => adjustEtaMinutes(-5)}
                      className="w-14 h-14 rounded-2xl bg-white border border-charcoal/5 text-xl font-bold text-charcoal hover:scale-105 active:scale-95 transition-all"
                    >
                      −
                    </button>
                    <div className="flex-1 text-center py-2">
                       <span className="text-5xl font-brand font-medium text-terracotta leading-none">{etaMinutes}</span>
                       <span className="text-xs font-brand font-bold text-charcoal/30 ml-2 uppercase">min</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustEtaMinutes(5)}
                      className="w-14 h-14 rounded-2xl bg-white border border-charcoal/5 text-xl font-bold text-charcoal hover:scale-105 active:scale-95 transition-all"
                    >
                      +
                    </button>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => printOrder(confirmingOrder.id)}
                className="py-5 rounded-full border border-charcoal text-charcoal font-brand font-bold uppercase tracking-widest text-[10px] hover:bg-charcoal hover:text-white transition-all shadow-lg shadow-charcoal/5"
              >
                🖨️ Stampa Scontrino
              </button>
              <button
                type="button"
                onClick={confirmIncomingOrder}
                disabled={confirmingLoading}
                className="py-5 rounded-full bg-terracotta text-white font-brand font-bold uppercase tracking-widest text-[10px] hover:scale-105 active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-terracotta/20"
              >
                {confirmingLoading ? "Processing..." : "Conferma & Notifica"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
