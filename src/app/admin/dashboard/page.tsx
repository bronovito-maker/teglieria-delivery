"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, getStatusTransitions } from "@/lib/constants";
import { cn, formatCurrency, formatTime, formatOrderCode } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

const KANBAN_COLUMNS = ["RECEIVED", "CONFIRMED", "READY", "OUT", "DELIVERED"];

const STATUS_BADGE_STYLES: Record<string, string> = {
  RECEIVED: "bg-marigold/10 text-marigold border-marigold/20",
  CONFIRMED: "bg-terracotta/10 text-terracotta border-terracotta/20",
  READY: "bg-terracotta/5 text-terracotta border-terracotta/10",
  OUT: "bg-charcoal text-white border-charcoal",
  DELIVERED: "bg-charcoal/10 text-charcoal/40 border-charcoal/10",
  CANCELLED: "bg-charcoal text-white border-charcoal",
};

function getStatusBadgeClass(status: string) {
  return STATUS_BADGE_STYLES[status] ?? "bg-charcoal/5 text-charcoal/40 border-charcoal/10";
}

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);

  // Cancel order state
  const [cancelTarget, setCancelTarget] = useState<OrderWithItems | null>(null);
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/ordini?date=${today}`);
    if (res.status === 401 || res.status === 403) {
      router.replace("/admin/login");
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data)) return;
    setOrders(data);
  }, [router]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Refresh when NewOrderAlert confirms/rejects an order
  useEffect(() => {
    const handler = () => fetchOrders();
    window.addEventListener("order-status-changed", handler);
    return () => window.removeEventListener("order-status-changed", handler);
  }, [fetchOrders]);

  async function updateStatus(orderId: string, status: string) {
    await fetch(`/api/ordini/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrders();
  }

  async function handleCancelOrder() {
    if (!cancelTarget || !cancelPassword.trim()) return;
    setCancelLoading(true);
    setCancelError(null);
    try {
      const res = await fetch(`/api/ordini/${cancelTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword: cancelPassword }),
      });
      if (res.ok) {
        setCancelTarget(null);
        setCancelPassword("");
        fetchOrders();
      } else {
        const data = await res.json().catch(() => ({}));
        setCancelError(data?.error ?? "Errore durante la cancellazione.");
      }
    } catch {
      setCancelError("Errore di rete. Riprova.");
    } finally {
      setCancelLoading(false);
    }
  }

  const activeOrders = orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;
  const preparingOrders = orders.filter((o) => o.status === "CONFIRMED" || o.status === "READY").length;
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.total), 0);
  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="pb-20">
      <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <span className="ds-micro-label text-terracotta/60 mb-4 block">
            Monitoraggio Operativo
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight text-charcoal leading-none">
            Overview <span className="text-terracotta">Ordini.</span>
          </h1>
          <p className="font-body italic text-charcoal/45 mt-4 text-sm">Live update • {today}</p>
        </div>

        <button
          onClick={fetchOrders}
          className="w-fit px-8 py-4 rounded-full border border-charcoal/10 bg-white shadow-sm text-charcoal font-brand font-semibold uppercase tracking-[0.2em] text-[10px] hover:bg-charcoal hover:text-white transition-all active:scale-95"
        >
          Aggiorna Dati
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Ordini Oggi", value: orders.length, accent: "charcoal" },
          { label: "Attivi", value: activeOrders, accent: "terracotta" },
          { label: "In Cucina", value: preparingOrders, accent: "marigold" },
          { label: "Fatturato", value: formatCurrency(totalRevenue), accent: "charcoal" },
        ].map((stat, i) => (
          <div key={i} className="bg-white/60 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-charcoal/5 p-5 md:p-6 shadow-sm">
            <p className="text-[10px] uppercase font-brand font-semibold tracking-[0.2em] text-charcoal/30 mb-4">{stat.label}</p>
            <p className={cn("text-3xl font-brand font-semibold tracking-tight", stat.accent === "terracotta" ? "text-terracotta" : stat.accent === "marigold" ? "text-marigold" : "text-charcoal")}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Grouped inline rows by status */}
      <div className="space-y-3">
        {KANBAN_COLUMNS.map((status) => {
          const columnOrders = orders.filter((o) => o.status === status);
          return (
            <div key={status} className="rounded-[2rem] border border-charcoal/5 bg-white/35 backdrop-blur-sm overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-charcoal/5 bg-white/40">
                <span className={`px-3 py-1 rounded-full text-[9px] font-brand font-semibold uppercase tracking-[0.18em] ${getStatusBadgeClass(status)}`}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <span className="text-[10px] font-brand font-semibold text-charcoal/25">{columnOrders.length}</span>
              </div>

              {columnOrders.length === 0 ? (
                <div className="px-5 py-4 text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/15">
                  Vuoto
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto px-5 py-4 no-scrollbar">
                  {columnOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => router.push(`/admin/ordini/${order.id}`)}
                      className="flex-shrink-0 w-56 bg-white rounded-[1.5rem] shadow-sm border border-charcoal/5 p-5 hover:shadow-lg hover:shadow-terracotta/5 hover:scale-[1.02] transition-all group cursor-pointer"
                    >
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="font-brand font-semibold text-charcoal text-base">#{formatOrderCode(order)}</span>
                        <span className="text-[10px] font-body text-charcoal/30">{formatTime(order.createdAt)}</span>
                      </div>

                      <p className="text-sm font-brand font-semibold text-charcoal mb-0.5 truncate">{order.customerName}</p>
                      <p className="text-[10px] font-body text-charcoal/40 italic mb-1">
                        {order.type === "ASPORTO" ? "Ritiro Sede" : "Consegna"}
                      </p>
                      {order.type === "DELIVERY" && order.address && (
                        <p className="text-[10px] font-body text-charcoal/50 truncate mb-3">📍 {order.address}</p>
                      )}

                      <div className="space-y-1 mb-3">
                        {order.items.slice(0, 3).map((item) => (
                          <p key={item.id} className="text-[10px] text-charcoal/60 truncate">
                            <span className="text-terracotta font-semibold">{item.quantity}×</span> {item.productName}
                          </p>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-[9px] text-charcoal/20 uppercase tracking-widest font-brand">+{order.items.length - 3} altri</p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-charcoal/5">
                        <span className="font-brand font-semibold text-charcoal text-sm">{formatCurrency(Number(order.total))}</span>
                        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                          {status === "RECEIVED" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                window.dispatchEvent(new CustomEvent("open-order-alert", { detail: order }));
                              }}
                              className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-charcoal text-white hover:bg-terracotta transition-colors text-xs"
                              title="Conferma"
                            >
                              ✓
                            </button>
                          ) : (
                            getStatusTransitions(order.type, status)
                              .filter((nextStatus) => nextStatus !== "CANCELLED")
                              .map((nextStatus) => (
                                <button
                                  key={nextStatus}
                                  onClick={(e) => { e.stopPropagation(); updateStatus(order.id, nextStatus); }}
                                  className="flex-shrink-0 h-8 px-2.5 rounded-xl font-brand font-semibold text-[8px] uppercase tracking-[0.16em] whitespace-nowrap transition-all bg-charcoal/5 text-charcoal hover:bg-charcoal hover:text-white"
                                >
                                  {ORDER_STATUS_LABELS[nextStatus]}
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cancel Order Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[110] bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-warm-light rounded-[3rem] p-10 shadow-2xl border border-white/20">
            <div className="flex justify-between items-start mb-10">
              <div>
                <span className="text-[10px] font-brand font-semibold uppercase tracking-[0.3em] text-red-500 mb-2 block">⚠ Azione Irreversibile</span>
                <h3 className="text-3xl font-display font-semibold text-charcoal tracking-tight">Annulla Ordine</h3>
                <p className="font-body italic text-charcoal/50 text-sm mt-2">#{formatOrderCode(cancelTarget)} · {cancelTarget.customerName}</p>
              </div>
              <button
                onClick={() => setCancelTarget(null)}
                className="w-12 h-12 rounded-2xl bg-white border border-charcoal/5 text-charcoal hover:bg-charcoal hover:text-white transition-all flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-red-50 border border-red-100 rounded-3xl p-6">
                <p className="text-[10px] font-brand font-bold uppercase tracking-widest text-red-400 mb-1">Attenzione</p>
                <p className="font-body italic text-sm text-red-600">La cancellazione è permanente e non può essere annullata. Inserisci la password amministratore per procedere.</p>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/30 ml-4">
                  Password Admin
                </label>
                <input
                  type="password"
                  autoFocus
                  value={cancelPassword}
                  onChange={(e) => { setCancelPassword(e.target.value); setCancelError(null); }}
                  onKeyDown={async (e) => { if (e.key === "Enter") await handleCancelOrder(); }}
                  placeholder="••••••••"
                  className="w-full px-8 py-5 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-red-200 focus:border-red-300 outline-none transition-all shadow-sm"
                />
              </div>

              {cancelError && (
                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 animate-in slide-in-from-top-2">
                  <p className="text-[11px] text-red-600 font-brand font-bold uppercase tracking-widest text-center">{cancelError}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelTarget(null)}
                  className="py-5 rounded-full border border-charcoal/10 text-charcoal font-brand font-bold uppercase tracking-widest text-[10px] hover:bg-charcoal/5 transition-all"
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleCancelOrder}
                  disabled={cancelLoading || !cancelPassword.trim()}
                  className="py-5 rounded-full bg-red-500 text-white font-brand font-bold uppercase tracking-widest text-[10px] hover:bg-red-600 active:scale-95 disabled:opacity-50 transition-all shadow-xl shadow-red-500/20"
                >
                  {cancelLoading ? "Eliminazione..." : "Conferma Cancellazione"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
