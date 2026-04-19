"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatOrderCode } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

function formatPickupDate(pickupTime: Date | string | null | undefined): string | null {
  if (!pickupTime) return null;
  const d = new Date(pickupTime);
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const tomorrowMidnight = new Date(todayMidnight);
  tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
  const dayAfterMidnight = new Date(tomorrowMidnight);
  dayAfterMidnight.setDate(dayAfterMidnight.getDate() + 1);

  const time = d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" });

  if (d >= todayMidnight && d < tomorrowMidnight) {
    return `Oggi · ${time}`;
  }
  if (d >= tomorrowMidnight && d < dayAfterMidnight) {
    return `Domani · ${time}`;
  }
  const dateStr = d.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", timeZone: "Europe/Rome" });
  return `${dateStr} · ${time}`;
}

export default function NewOrderAlert() {
  const router = useRouter();
  const [confirmingOrder, setConfirmingOrder] = useState<OrderWithItems | null>(null);
  const [etaMinutes, setEtaMinutes] = useState(30);
  const [confirmingLoading, setConfirmingLoading] = useState(false);
  const [isRepeatCustomer, setIsRepeatCustomer] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
  const [mounted, setMounted] = useState(false);

  const prevCountRef = useRef(0);
  const alertIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const alertCtxRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Stable ref so event listener and fetchNewOrders don't need openConfirmModal as dep
  const openConfirmModalRef = useRef<(order: OrderWithItems) => void>(() => {});

  useEffect(() => {
    setMounted(true);
    if (typeof Notification !== "undefined") {
      setNotifPermission(Notification.permission);
    }
  }, []);

  // Listen for manual trigger from dashboard ✓ button
  useEffect(() => {
    const handler = (e: Event) => {
      const order = (e as CustomEvent<OrderWithItems>).detail;
      if (order) openConfirmModalRef.current(order);
    };
    window.addEventListener("open-order-alert", handler);
    return () => window.removeEventListener("open-order-alert", handler);
  }, []);

  function playBeepPattern(ctx: AudioContext) {
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
      playBeepPattern(ctx);
      alertIntervalRef.current = setInterval(() => playBeepPattern(ctx), 2200);
      const stop = () => stopOrderAlert();
      document.addEventListener("pointerdown", stop, { once: true });
    } catch {
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
    // For future-date orders, ETA widget is irrelevant — default to 30 min
    const isFutureOrder = order.pickupTime
      ? new Date(order.pickupTime) > new Date(new Date().setHours(23, 59, 59, 999))
      : false;

    if (!isFutureOrder && order.estimatedTime) {
      const diff = Math.round((new Date(order.estimatedTime).getTime() - Date.now()) / 60000);
      setEtaMinutes(Math.max(5, diff));
    } else {
      setEtaMinutes(30);
    }
    setConfirmingOrder(order);
    setIsRepeatCustomer(false);
    startOrderAlert();

    if (order.customerPhone) {
      fetch(`/api/ordini?phone=${encodeURIComponent(order.customerPhone)}&countOnly=1`)
        .then((r) => r.json())
        .then(({ count }: { count: number }) => setIsRepeatCustomer(count > 1))
        .catch(() => {});
    }
  }

  // Keep ref pointing to the latest version of openConfirmModal (updated every render)
  openConfirmModalRef.current = openConfirmModal;

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
      body: JSON.stringify({ status: "CONFIRMED", estimatedTime }),
    });
    closeConfirmModal();
    // Signal dashboard (and any other page) to refresh
    window.dispatchEvent(new CustomEvent("order-status-changed"));
  }

  async function rejectOrder() {
    if (!confirmingOrder) return;
    closeConfirmModal();
    await fetch(`/api/ordini/${confirmingOrder.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "CANCELLED" }),
    });
    window.dispatchEvent(new CustomEvent("order-status-changed"));
  }

  function printOrder(orderId: string) {
    const w = window.open(`/api/ordini/${orderId}/stampa`, "_blank", "width=420,height=700");
    w?.addEventListener("load", () => w.print());
  }

  async function requestNotifPermission() {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
  }

  // Global polling — runs on every admin page
  const fetchNewOrders = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const res = await fetch(`/api/ordini?date=${today}`);
    if (res.status === 401 || res.status === 403) {
      router.replace("/admin/login");
      return;
    }
    const data = await res.json();
    if (!Array.isArray(data)) return;

    const receivedOrders = data.filter((o: OrderWithItems) => o.status === "RECEIVED");
    const prevReceived = prevCountRef.current;

    if (prevReceived > 0 && receivedOrders.length > prevReceived) {
      const newest = receivedOrders[receivedOrders.length - 1];
      if (typeof Notification !== "undefined" && Notification.permission === "granted" && newest) {
        new Notification("Nuovo Ordine — La Teglieria", {
          body: `#${formatOrderCode(newest)} · ${newest.customerName} · ${newest.type === "DELIVERY" ? "Delivery" : "Asporto"}`,
          icon: "/favicon.ico",
          tag: newest.id,
          requireInteraction: true,
        });
      }
      if (newest) openConfirmModalRef.current(newest);
    }
    prevCountRef.current = receivedOrders.length;
  }, [router]);

  useEffect(() => {
    fetchNewOrders();
    const interval = setInterval(fetchNewOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchNewOrders]);

  if (!mounted) return null;

  const eta = new Date(Date.now() + etaMinutes * 60000).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome",
  });

  const pickupLabel = confirmingOrder ? formatPickupDate(confirmingOrder.pickupTime) : null;
  const isScheduled = confirmingOrder?.pickupTime
    ? new Date(confirmingOrder.pickupTime) > new Date(new Date().setHours(23, 59, 59, 999))
    : false;

  return (
    <>
      {/* Hidden audio fallback */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jj4+Lh4J/fH5+goaIiYiGgoB9fH1/goaIioqIhoJ/fHx+gYWIioqIhoJ+fHx+gYWIioqIhoN+fHt9gIWIiomHhIF+fHx+gYWHiYiHhYJ/fXx9f4KFh4iHhYOAfnx8foCDhoiHhoSBf319foGEhoeGhYOBf359f4GEhoaGhIKAf359foCDhYaFhIOBf35+foCChYWFhIOBf359foGDhIWEg4KAf35+foCChIWEg4KAf35+fn+ChISEg4F/fn5+f4GDhISDgoB/fn1+f4GDg4ODgYB/fn5+f4GCg4OCgYB/fn5+f4GCg4OCgYB/fn5+foGCgoKBgH9/fn5+f4GCgoKBgH9+fn5+f4GBgoGAgH9+fn5+f4GBgYGAgH9+fn5/f4CBAAAAAIAAAACAf4B/gH+Af4B/gICAgICAgICAgICAgA==" type="audio/wav" />
      </audio>

      {/* Notification permission button — shown on all admin pages when not granted */}
      {notifPermission !== "granted" && typeof Notification !== "undefined" && (
        <div className="fixed bottom-6 right-6 z-[90]">
          <button
            onClick={requestNotifPermission}
            className="px-5 py-3 rounded-full border border-marigold/30 bg-white shadow-lg text-marigold font-brand font-bold uppercase tracking-widest text-[10px] hover:bg-marigold hover:text-white transition-all active:scale-95 flex items-center gap-2"
          >
            🔔 Abilita notifiche
          </button>
        </div>
      )}

      {/* Confirmation popup */}
      {confirmingOrder && (
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
                onClick={rejectOrder}
                className="text-[11px] font-brand font-bold text-charcoal/50 hover:text-red-500 transition-colors uppercase tracking-wider"
              >
                Rifiuta
              </button>
            </div>

            {/* Scheduled date — shown prominently when order is for a future date */}
            {pickupLabel && (
              <div className={`mx-6 mt-2 mb-1 px-4 py-2.5 rounded-2xl text-center ${isScheduled ? "bg-marigold/15 border border-marigold/20" : "bg-charcoal/5"}`}>
                <p className={`text-[11px] font-brand font-bold uppercase tracking-wider ${isScheduled ? "text-marigold" : "text-charcoal/40"}`}>
                  {isScheduled ? "Ordine programmato" : "Ritiro/consegna"}
                </p>
                <p className={`text-sm font-brand font-bold mt-0.5 ${isScheduled ? "text-charcoal" : "text-charcoal/60"}`}>{pickupLabel}</p>
              </div>
            )}

            {/* ETA selector — hidden for future-date orders */}
            {!isScheduled && (
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
            )}

            {/* Accept button */}
            <div className="px-6 pb-4">
              <button
                type="button"
                onClick={confirmIncomingOrder}
                disabled={confirmingLoading}
                className="w-full py-4 rounded-[999px] bg-terracotta text-white font-brand font-bold text-base tracking-wide hover:bg-terracotta/90 active:scale-[0.98] disabled:opacity-50 transition-all shadow-lg shadow-terracotta/25"
              >
                {confirmingLoading ? "Confermando..." : isScheduled ? "Accetta prenotazione" : "Accetta"}
              </button>
            </div>

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
                    {Array.isArray(item.additions) && (item.additions as { name: string }[]).map((a) => (
                      <p key={a.name} className="text-[11px] text-charcoal/40 font-body ml-5">+ {a.name}</p>
                    ))}
                    {Array.isArray(item.removals) && (item.removals as { name: string }[]).map((r) => (
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
      )}
    </>
  );
}
