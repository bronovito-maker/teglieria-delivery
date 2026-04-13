"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

const KANBAN_COLUMNS = ["RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT", "DELIVERED"];

const STATUS_BADGE_STYLES: Record<string, string> = {
  RECEIVED: "bg-amber-50 text-amber-700 border-amber-200",
  CONFIRMED: "bg-red-50 text-red-700 border-red-200",
  PREPARING: "bg-orange-50 text-orange-700 border-orange-200",
  READY: "bg-emerald-50 text-emerald-700 border-emerald-200",
  OUT: "bg-sky-50 text-sky-700 border-sky-200",
  DELIVERED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};

function getStatusBadgeClass(status: string) {
  return STATUS_BADGE_STYLES[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
}

export default function DashboardPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
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

  const activeOrders = orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;
  const preparingOrders = orders.filter((o) => o.status === "PREPARING" || o.status === "READY").length;
  const totalRevenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, order) => sum + Number(order.total), 0);
  const avgTicket = orders.length ? totalRevenue / orders.length : 0;
  const today = new Date().toLocaleDateString("it-IT", {
    weekday: "short",
    day: "2-digit",
    month: "long",
  });

  return (
    <div className="pb-2">
      {/* Hidden audio for notification */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jj4+Lh4J/fH5+goaIiYiGgoB9fH1/goaIioqIhoJ/fHx+gYWIioqIhoJ+fHx+gYWIioqIhoN+fHt9gIWIiomHhIF+fHx+gYWHiYiHhYJ/fXx9f4KFh4iHhYOAfnx8foCDhoiHhoSBf319foGEhoeGhYOBf359f4GEhoaGhIKAf359foCDhYaFhIOBf35+foCChYWFhIOBf359foGDhIWEg4KAf35+foCChIWEg4KAf35+fn+ChISEg4F/fn5+f4GDhISDgoB/fn1+f4GDg4ODgYB/fn5+f4GCg4OCgYB/fn5+f4GCg4OCgYB/fn5+foGCgoKBgH9/fn5+f4GCgoKBgH9+fn5+f4GBgoGAgH9+fn5+f4GBgYGAgH9+fn5/f4CBAAAAAIAAAACAf4B/gH+Af4B/gICAgICAgICAgICAgA==" type="audio/wav" />
      </audio>

      <div className="mb-6 md:mb-8 rounded-2xl md:rounded-3xl border border-red-100/80 bg-white/80 p-4 md:p-5 lg:p-6 shadow-[0_12px_28px_rgba(31,38,135,0.06)]">
        <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-2">
          Admin Control
        </p>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 lg:gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-[#1d1d1f]">Dashboard</h1>
            <p className="hidden md:block text-gray-500 mt-1">Panoramica ordini e gestione rapida della cucina.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-red-100/80 bg-white/90 px-3 py-2.5 text-xs font-medium text-gray-600 min-h-[40px] flex items-center">
              {today}
            </div>
            <button
              onClick={fetchOrders}
              className="rounded-xl border border-red-100/80 bg-red-50/70 px-3.5 py-2.5 text-xs font-semibold text-[#cf2a1d] hover:bg-red-100/70 transition-colors min-h-[40px]"
            >
              Aggiorna ora
            </button>
            <div className="rounded-xl border border-red-100/80 bg-white/90 px-3 py-2.5 text-xs font-medium text-gray-600 min-h-[40px] flex items-center">
              Live ogni 5s
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="rounded-2xl border border-red-100/70 bg-white/90 p-3 md:p-4 shadow-[0_8px_18px_rgba(31,38,135,0.04)]">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-gray-400 mb-1.5 md:mb-2">Ordini Oggi</p>
          <p className="text-2xl xl:text-3xl font-bold text-[#1d1d1f]">{orders.length}</p>
        </div>
        <div className="rounded-2xl border border-red-100/70 bg-white/90 p-3 md:p-4 shadow-[0_8px_18px_rgba(31,38,135,0.04)]">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-gray-400 mb-1.5 md:mb-2">Attivi</p>
          <p className="text-2xl xl:text-3xl font-bold text-[#cf2a1d]">{activeOrders}</p>
        </div>
        <div className="rounded-2xl border border-red-100/70 bg-white/90 p-3 md:p-4 shadow-[0_8px_18px_rgba(31,38,135,0.04)]">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-gray-400 mb-1.5 md:mb-2">In Preparazione</p>
          <p className="text-2xl xl:text-3xl font-bold text-[#1d1d1f]">{preparingOrders}</p>
        </div>
        <div className="rounded-2xl border border-red-100/70 bg-white/90 p-3 md:p-4 shadow-[0_8px_18px_rgba(31,38,135,0.04)]">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-gray-400 mb-1.5 md:mb-2">Fatturato</p>
          <p className="text-lg md:text-xl xl:text-2xl font-bold text-[#1d1d1f]">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="rounded-2xl border border-red-100/70 bg-white/90 p-3 md:p-4 shadow-[0_8px_18px_rgba(31,38,135,0.04)]">
          <p className="text-[11px] md:text-xs uppercase tracking-[0.14em] text-gray-400 mb-1.5 md:mb-2">Scontrino Medio</p>
          <p className="text-lg md:text-xl xl:text-2xl font-bold text-[#1d1d1f]">{formatCurrency(avgTicket)}</p>
        </div>
      </div>

      {/* Kanban */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-2.5 md:gap-3 pb-4">
        {KANBAN_COLUMNS.map((status) => {
          const columnOrders = orders.filter((o) => o.status === status);
          return (
            <div
              key={status}
              className="rounded-2xl border border-red-100/70 bg-white/80 backdrop-blur-sm p-3 md:p-4"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-full border text-[11px] md:text-xs font-semibold ${getStatusBadgeClass(status)}`}>
                  {ORDER_STATUS_LABELS[status]}
                </span>
                <span className="text-[11px] md:text-xs text-gray-400">{columnOrders.length} ordini</span>
              </div>
              <div className="space-y-2">
                {columnOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-xl shadow-sm p-3 border border-red-100/60 border-l-4"
                    style={{ borderLeftColor: status === "RECEIVED" ? "#f59e0b" : status === "CANCELLED" ? "#ef4444" : "#f97316" }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">#{order.orderNumber}</span>
                      <span className="text-[11px] text-gray-400">{formatTime(order.createdAt)}</span>
                    </div>
                    <p className="text-sm font-medium">{order.customerName}</p>
                    <p className="text-xs text-gray-500">
                      {order.type === "ASPORTO" ? "Asporto" : "Delivery"}
                      {order.type === "DELIVERY" && order.address && ` - ${order.address}`}
                    </p>
                    <div className="mt-1.5 text-xs text-gray-600">
                      {order.items.slice(0, 3).map((item) => (
                        <p key={item.id}>{item.quantity}x {item.productName}</p>
                      ))}
                      {order.items.length > 3 && <p className="text-gray-400">+{order.items.length - 3} altri</p>}
                    </div>
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t">
                      <span className="font-semibold text-sm">{formatCurrency(Number(order.total))}</span>
                      <div className="flex gap-1.5 flex-wrap justify-end">
                        {ORDER_STATUS_TRANSITIONS[status]?.map((nextStatus) => (
                          <button
                            key={nextStatus}
                            onClick={() => updateStatus(order.id, nextStatus)}
                            className={`px-2.5 py-1.5 rounded-full border text-xs font-semibold min-h-[36px] transition-colors ${
                              nextStatus === "CANCELLED"
                                ? "bg-red-100 border-red-200 text-red-700 hover:bg-red-200"
                                : "bg-red-50 border-red-100 text-[#cf2a1d] hover:bg-red-100"
                            }`}
                          >
                            {ORDER_STATUS_LABELS[nextStatus]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {columnOrders.length === 0 && (
                  <div className="rounded-xl border border-dashed border-red-100/90 bg-white/65 py-7 text-center">
                    <p className="text-xs text-gray-300">Nessun ordine</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
