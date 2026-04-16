"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
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
  const [confirmingOrder, setConfirmingOrder] = useState<OrderWithItems | null>(null);
  const [etaMinutes, setEtaMinutes] = useState(30);
  const [confirmingLoading, setConfirmingLoading] = useState(false);
  const [isRepeatCustomer, setIsRepeatCustomer] = useState(false);
  const prevCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertCtxRef = useRef<AudioContext | null>(null);

  // Cancel order state
  const [cancelTarget, setCancelTarget] = useState<OrderWithItems | null>(null);
  const [cancelPassword, setCancelPassword] = useState("");
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  // Browser notification permission
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof Notification !== "undefined") {
      setNotifPermission(Notification.permission);
    }
  }, []);

  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  const fetchOrders = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/ordini?date=${today}`);
    const data = await res.json();
    setOrders(data);

    // Sound + browser notification + auto-popup on new RECEIVED order
    const receivedOrders = (data as OrderWithItems[]).filter((o) => o.status === "RECEIVED");
    const prevReceived = prevCountRef.current;
    if (prevReceived > 0 && receivedOrders.length > prevReceived) {
      const newest = receivedOrders[receivedOrders.length - 1];
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("🍕 Nuovo Ordine — La Teglieria", {
          body: newest ? `#${formatOrderCode(newest)} · ${newest.customerName} · ${newest.type === "DELIVERY" ? "Delivery" : "Asporto"}` : "Nuovo ordine ricevuto!",
          icon: "/favicon.ico",
          tag: newest?.id ?? "new-order",
          requireInteraction: true,
        });
      }
      // Auto-open confirmation popup
      if (newest) openConfirmModal(newest);
    }
    prevCountRef.current = receivedOrders.length;
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

  function playBeepPattern(ctx: AudioContext) {
    // 3 sharp beeps at 880Hz — cuts through kitchen noise
    [0, 0.18, 0.36].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.14);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.15);
    });
  }

  function startOrderAlert() {
    try {
      const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      alertCtxRef.current = ctx;

      // Play immediately, then every 2.2s
      playBeepPattern(ctx);
      alertIntervalRef.current = setInterval(() => playBeepPattern(ctx), 2200);

      // Stop on ANY touch/click anywhere
      const stop = () => stopOrderAlert();
      document.addEventListener("pointerdown", stop, { once: true });
    } catch {
      // Web Audio not available — fall back to the HTML audio element
      audioRef.current?.play().catch(() => {});
    }
  }

  function stopOrderAlert() {
    if (alertIntervalRef.current) {
      clearInterval(alertIntervalRef.current);
      alertIntervalRef.current = null;
    }
    alertCtxRef.current?.close().catch(() => {});
    alertCtxRef.current = null;
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
    setIsRepeatCustomer(false);
    startOrderAlert();

    // Check historical orders for this phone number (excluding current order)
    if (order.customerPhone) {
      fetch(`/api/ordini?phone=${encodeURIComponent(order.customerPhone)}&countOnly=1`)
        .then((r) => r.json())
        .then(({ count }: { count: number }) => {
          // count includes current order, so repeat = count > 1
          setIsRepeatCustomer(count > 1);
        })
        .catch(() => {});
    }
  }

  function closeConfirmModal() {
    stopOrderAlert();
    setConfirmingOrder(null);
    setEtaMinutes(30);
    setConfirmingLoading(false);
    setIsRepeatCustomer(false);
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
          <h1 className="text-5xl md:text-6xl font-display tracking-tight text-charcoal">
            Overview <span className="text-terracotta">Ordini.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-4 tracking-widest uppercase text-xs">Live Update • {today}</p>
        </div>
        
        <div className="flex gap-3 flex-wrap">
          {mounted && notifPermission !== "granted" && typeof Notification !== "undefined" && (
            <button
              onClick={requestNotifPermission}
              className="px-8 py-4 rounded-full border border-marigold/30 bg-marigold/5 text-marigold font-brand font-bold uppercase tracking-widest text-[10px] hover:bg-marigold hover:text-white transition-all active:scale-95 flex items-center gap-2"
            >
              🔔 Abilita Notifiche
            </button>
          )}
          {mounted && notifPermission === "granted" && (
            <span className="px-6 py-4 rounded-full border border-charcoal/5 bg-white text-charcoal/30 font-brand font-bold uppercase tracking-widest text-[9px] flex items-center gap-2">
              🔔 Notifiche Attive
            </span>
          )}
          <button
            onClick={fetchOrders}
            className="px-8 py-4 rounded-full border border-charcoal/10 bg-white shadow-sm text-charcoal font-brand font-bold uppercase tracking-widest text-[10px] hover:bg-charcoal hover:text-white transition-all active:scale-95"
          >
            Aggiorna Dati
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Ordini Oggi", value: orders.length, accent: "charcoal" },
          { label: "Attivi", value: activeOrders, accent: "terracotta" },
          { label: "In Cucina", value: preparingOrders, accent: "marigold" },
          { label: "Fatturato", value: formatCurrency(totalRevenue), accent: "charcoal" },
        ].map((stat, i) => (
          <div key={i} className="bg-white/50 backdrop-blur-md rounded-2xl md:rounded-[2rem] border border-charcoal/5 p-5 md:p-6 shadow-sm">
            <p className="text-[10px] uppercase font-brand font-bold tracking-[0.2em] text-charcoal/30 mb-4">{stat.label}</p>
            <p className={cn("text-3xl font-brand font-medium tracking-tight", stat.accent === "terracotta" ? "text-terracotta" : stat.accent === "marigold" ? "text-marigold" : "text-charcoal")}>
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
            <div key={status} className="rounded-[2rem] border border-charcoal/5 bg-white/30 overflow-hidden">
              {/* Row header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-charcoal/5">
                <span className={`px-3 py-1 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest ${getStatusBadgeClass(status)}`}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <span className="text-[10px] font-brand font-bold text-charcoal/25">{columnOrders.length}</span>
              </div>

              {/* Horizontal scroll of cards */}
              {columnOrders.length === 0 ? (
                <div className="px-5 py-4 text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/15">
                  Vuoto
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto px-5 py-4 scrollbar-none">
                  {columnOrders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => router.push(`/admin/ordini/${order.id}`)}
                      className="flex-shrink-0 w-52 bg-white rounded-[1.5rem] shadow-sm border border-charcoal/5 p-5 hover:shadow-lg hover:scale-[1.02] transition-all group cursor-pointer"
                    >
                      {/* Card header */}
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="font-brand font-bold text-charcoal text-base">#{formatOrderCode(order)}</span>
                        <span className="text-[10px] font-body text-charcoal/30">{formatTime(order.createdAt)}</span>
                      </div>

                      {/* Customer */}
                      <p className="text-xs font-brand font-bold text-charcoal uppercase tracking-tight mb-0.5">{order.customerName}</p>
                      <p className="text-[10px] font-body text-charcoal/40 italic mb-1">
                        {order.type === "ASPORTO" ? "Ritiro Sede" : "Consegna"}
                      </p>
                      {order.type === "DELIVERY" && order.address && (
                        <p className="text-[10px] font-body text-charcoal/50 truncate mb-3">📍 {order.address}</p>
                      )}

                      {/* Items */}
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

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-charcoal/5">
                        <span className="font-brand font-bold text-charcoal text-sm">{formatCurrency(Number(order.total))}</span>
                        <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                          {status === "RECEIVED" ? (
                            <button
                              onClick={(e) => { e.stopPropagation(); openConfirmModal(order); }}
                              className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded-xl bg-charcoal text-white hover:bg-terracotta transition-colors text-xs"
                              title="Conferma"
                            >
                              ✓
                            </button>
                          ) : (
                            ORDER_STATUS_TRANSITIONS[status]
                              ?.filter((nextStatus) => nextStatus !== "CANCELLED")
                              .map((nextStatus) => (
                              <button
                                key={nextStatus}
                                onClick={(e) => { e.stopPropagation(); updateStatus(order.id, nextStatus); }}
                                className="flex-shrink-0 h-8 px-2.5 rounded-xl font-brand font-bold text-[8px] uppercase tracking-widest whitespace-nowrap transition-all bg-charcoal/5 text-charcoal hover:bg-charcoal hover:text-white"
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

      {confirmingOrder && (() => {
        const eta = new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

        return (
          <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6 animate-in fade-in duration-200">
            <div className="w-full sm:max-w-sm bg-[#f5f0e8] rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden">

              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-2">
                <div className="w-16" />
                <div className="text-center">
                  <p className="font-brand font-bold text-charcoal text-lg">
                    {confirmingOrder.type === "DELIVERY" ? "Delivery" : "Asporto"}
                  </p>
                  <p className="text-[11px] text-charcoal/50 font-body">#{formatOrderCode(confirmingOrder)}</p>
                </div>
                <button
                  onClick={() => { closeConfirmModal(); updateStatus(confirmingOrder.id, "CANCELLED"); }}
                  className="text-[11px] font-brand font-bold text-charcoal/50 hover:text-red-500 transition-colors uppercase tracking-wider"
                >
                  Rifiuta
                </button>
              </div>

              {/* ETA selector */}
              <div className="px-6 py-4 text-center">
                <p className="text-[11px] font-body text-charcoal/50 mb-3">Hai bisogno di tempo extra?</p>
                <div className="flex items-center justify-center gap-6">
                  <button
                    type="button"
                    onClick={() => adjustEtaMinutes(-5)}
                    className="w-12 h-12 rounded-full bg-white shadow-md text-xl font-bold text-charcoal active:scale-95 transition-transform"
                  >
                    −
                  </button>
                  <div className="text-center w-20">
                    <span className="text-4xl font-brand font-bold text-charcoal tabular-nums">{etaMinutes}</span>
                    <p className="text-[11px] text-charcoal/40 font-body">mins</p>
                    <p className="text-[13px] font-brand font-bold text-charcoal/70 tabular-nums">{eta}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => adjustEtaMinutes(5)}
                    className="w-12 h-12 rounded-full bg-white shadow-md text-xl font-bold text-charcoal active:scale-95 transition-transform"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Accept button */}
              <div className="px-6 pb-4">
                <button
                  type="button"
                  onClick={confirmIncomingOrder}
                  disabled={confirmingLoading}
                  className="w-full py-4 rounded-[999px] bg-terracotta text-white font-brand font-bold text-base tracking-wide hover:bg-terracotta/90 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-terracotta/25"
                >
                  {confirmingLoading ? "Confermando..." : "Accetta"}
                </button>
              </div>

              {/* Divider */}
              <div className="mx-6 border-t border-charcoal/10" />

              {/* Scrollable details */}
              <div className="px-6 py-4 max-h-[40vh] overflow-y-auto space-y-4">

                {/* Customer phone + repeat badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-brand font-bold text-charcoal text-sm">{confirmingOrder.customerPhone || confirmingOrder.customerName}</p>
                    {confirmingOrder.address && (
                      <p className="text-[11px] text-charcoal/50 font-body mt-0.5">📍 {confirmingOrder.address}</p>
                    )}
                  </div>
                  {isRepeatCustomer && (
                    <span className="px-3 py-1 rounded-full bg-marigold/15 text-marigold text-[10px] font-brand font-bold uppercase tracking-wider">
                      Cliente abituale
                    </span>
                  )}
                </div>

                {/* Notes */}
                {confirmingOrder.notes && (
                  <div className="flex items-start gap-2 bg-white/60 rounded-2xl p-3 border border-charcoal/5">
                    <span className="text-base mt-0.5">💬</span>
                    <p className="text-[12px] font-body text-charcoal/70 italic leading-relaxed">{confirmingOrder.notes}</p>
                  </div>
                )}

                {/* Total + payment */}
                <div className="flex items-center justify-between">
                  <span className="font-brand font-bold text-charcoal text-lg">{formatCurrency(Number(confirmingOrder.total))}</span>
                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 text-[10px] font-brand font-bold uppercase tracking-wider border border-green-100">
                    {String(confirmingOrder.paymentMethod) === "CARTA" ? "Carta" : "Contanti"}
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  {confirmingOrder.items.map((item) => (
                    <div key={item.id}>
                      <div className="flex justify-between items-baseline text-sm">
                        <span className="text-charcoal/70 font-body">
                          <span className="text-charcoal font-semibold">{item.quantity} ×</span> {item.productName}
                          {item.variant && <span className="text-charcoal/40 text-xs ml-1">({item.variant})</span>}
                        </span>
                        <span className="font-brand font-bold text-charcoal tabular-nums text-xs">{formatCurrency(Number(item.totalPrice))}</span>
                      </div>
                      {Array.isArray(item.additions) && (item.additions as {name:string}[]).map((a) => (
                        <p key={a.name} className="text-[11px] text-charcoal/40 font-body ml-5">+ {a.name}</p>
                      ))}
                      {Array.isArray(item.removals) && (item.removals as {name:string}[]).map((r) => (
                        <p key={r.name} className="text-[11px] text-charcoal/40 font-body ml-5 line-through">− {r.name}</p>
                      ))}
                    </div>
                  ))}
                </div>

              </div>

              {/* Print button */}
              <div className="px-6 pb-6 pt-2">
                <button
                  type="button"
                  onClick={() => printOrder(confirmingOrder.id)}
                  className="w-full py-3 rounded-[999px] border border-charcoal/20 text-charcoal font-brand font-bold text-[11px] uppercase tracking-widest hover:bg-charcoal/5 transition-colors"
                >
                  🖨️ Stampa scontrino
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Cancel Order Modal */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[110] bg-charcoal/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="w-full max-w-md bg-warm-light rounded-[3rem] p-10 shadow-2xl border border-white/20">
            <div className="flex justify-between items-start mb-10">
              <div>
                <span className="text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-red-500 mb-2 block">⚠ Azione Irreversibile</span>
                <h3 className="text-3xl font-brand font-medium text-charcoal uppercase tracking-tight">Annulla Ordine</h3>
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
