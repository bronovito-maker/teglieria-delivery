"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatTime } from "@/lib/utils";
import type { OrderWithItems } from "@/types";
import LogisticsMap from "@/components/admin/LogisticsMap";

type RiderSummary = {
  id: string;
  name: string;
  phone?: string | null;
  active: boolean;
  orders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    createdAt: string;
  }>;
};

const DELIVERY_ACTIVE_STATUSES = ["CONFIRMED", "PREPARING", "READY", "OUT"] as const;

function formatDuration(ms: number): string {
  if (ms <= 0) return "00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function LogisticaPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [riders, setRiders] = useState<RiderSummary[]>([]);
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const [ordersRes, ridersRes] = await Promise.all([
      fetch(`/api/ordini?date=${today}&type=DELIVERY`),
      fetch("/api/riders"),
    ]);

    if (ordersRes.ok) {
      const allDeliveryOrders: OrderWithItems[] = await ordersRes.json();
      setOrders(
        allDeliveryOrders.filter((order) =>
          DELIVERY_ACTIVE_STATUSES.includes(order.status as (typeof DELIVERY_ACTIVE_STATUSES)[number])
        )
      );
    }

    if (ridersRes.ok) {
      const riderData: RiderSummary[] = await ridersRes.json();
      setRiders(riderData);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const kpis = useMemo(() => {
    const assigned = orders.filter((o) => Boolean(o.riderId)).length;
    const out = orders.filter((o) => o.status === "OUT").length;
    const pending = orders.length - assigned;
    return { assigned, out, pending };
  }, [orders]);

  async function assignOrder(order: OrderWithItems) {
    const riderId = selectedRider[order.id] || order.riderId;
    if (!riderId) return;
    setSavingOrderId(order.id);

    const payload: Record<string, string> = { riderId, deliveryStatus: "ASSIGNED" };
    if (order.status === "READY") {
      payload.status = "OUT";
    }

    await fetch(`/api/ordini/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSavingOrderId(null);
    fetchData();
  }

  async function completeDelivery(order: OrderWithItems) {
    setSavingOrderId(order.id);
    await fetch(`/api/ordini/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DELIVERED",
        deliveryStatus: "DELIVERED",
        actualTime: new Date().toISOString(),
      }),
    });
    setSavingOrderId(null);
    fetchData();
  }

  function getDeliveryTimer(order: OrderWithItems): string {
    const outLog = order.statusHistory.find((log) => log.status === "OUT");
    if (!outLog) return "--:--";
    return formatDuration(nowTick - new Date(outLog.createdAt).getTime());
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6 md:mb-8">
        <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-2">
          Logistica
        </p>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">Gestione Fattorini</h1>
            <p className="text-gray-500 mt-1">Assegnazione ordini delivery e supporto operativo in tempo reale.</p>
          </div>
          <button
            onClick={fetchData}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-red-100 bg-red-50/60 text-[#cf2a1d] text-sm font-semibold hover:bg-red-100/70 transition-colors"
          >
            Aggiorna adesso
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="rounded-2xl border border-red-100/80 bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-1">Da assegnare</p>
          <p className="text-3xl font-bold text-[#cf2a1d]">{kpis.pending}</p>
        </div>
        <div className="rounded-2xl border border-red-100/80 bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-1">Assegnati</p>
          <p className="text-3xl font-bold text-[#1d1d1f]">{kpis.assigned}</p>
        </div>
        <div className="rounded-2xl border border-red-100/80 bg-white/90 p-4">
          <p className="text-xs uppercase tracking-[0.12em] text-gray-400 mb-1">In consegna</p>
          <p className="text-3xl font-bold text-[#1d1d1f]">{kpis.out}</p>
        </div>
      </div>

      <div className="mb-4">
        <LogisticsMap
          orders={orders.map((order) => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            address: order.address,
            status: order.status,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <section className="xl:col-span-2 rounded-2xl border border-red-100/80 bg-white/90 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 md:p-5">
          <h2 className="text-xl font-bold text-[#1d1d1f] mb-4">Ordini Delivery Operativi</h2>
          <div className="space-y-3">
            {orders.map((order) => {
              const riderDisplay = order.rider?.name || "Non assegnato";
              const timer = getDeliveryTimer(order);
              return (
                <div key={order.id} className="rounded-xl border border-red-100/70 bg-red-50/35 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div>
                      <p className="font-bold text-[#1d1d1f]">#{order.orderNumber} • {order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.address || "Indirizzo non disponibile"}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm mb-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400">Fattorino</p>
                      <p className="font-medium">{riderDisplay}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400">Totale</p>
                      <p className="font-semibold">{Number(order.total).toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.08em] text-gray-400">Timer consegna</p>
                      <p className="font-mono font-semibold text-[#cf2a1d]">{timer}</p>
                    </div>
                  </div>

                  <div className="flex flex-col md:flex-row gap-2">
                    <select
                      value={selectedRider[order.id] ?? order.riderId ?? ""}
                      onChange={(e) => setSelectedRider((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      className="flex-1 px-3 py-2.5 border border-red-100 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#cf2a1d]/30 outline-none"
                    >
                      <option value="">Seleziona fattorino...</option>
                      {riders.map((rider) => (
                        <option key={rider.id} value={rider.id}>
                          {rider.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => assignOrder(order)}
                      disabled={savingOrderId === order.id}
                      className="px-4 py-2.5 rounded-xl text-white font-semibold tomato-glass border hover:brightness-105 disabled:opacity-50 transition-all"
                    >
                      {savingOrderId === order.id ? "Salvo..." : order.riderId ? "Riassegna" : "Assegna"}
                    </button>

                    {order.status === "OUT" && (
                      <button
                        type="button"
                        onClick={() => completeDelivery(order)}
                        disabled={savingOrderId === order.id}
                        className="px-4 py-2.5 rounded-xl border border-red-100 bg-white text-[#cf2a1d] font-semibold hover:bg-red-50/60 disabled:opacity-50 transition-colors"
                      >
                        Segna consegnato
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {orders.length === 0 && (
              <div className="rounded-xl border border-dashed border-red-100/90 bg-white/70 py-8 text-center text-gray-400">
                Nessun ordine delivery operativo.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-red-100/80 bg-white/90 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 md:p-5">
          <h2 className="text-xl font-bold text-[#1d1d1f] mb-4">Fattorini disponibili</h2>
          <div className="space-y-2.5">
            {riders.map((rider) => (
              <div key={rider.id} className="rounded-xl border border-red-100/70 bg-red-50/30 p-3">
                <p className="font-semibold text-[#1d1d1f]">{rider.name}</p>
                <p className="text-xs text-gray-500">{rider.phone || "Telefono non disponibile"}</p>
                <p className="text-xs mt-2 text-gray-600">
                  Ordini attivi: <span className="font-semibold">{rider.orders.length}</span>
                </p>
                {rider.orders.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Ultimo: #{rider.orders[0].orderNumber} ({ORDER_STATUS_LABELS[rider.orders[0].status] || rider.orders[0].status})
                  </p>
                )}
              </div>
            ))}
            {riders.length === 0 && (
              <div className="rounded-xl border border-dashed border-red-100/90 bg-white/70 py-8 text-center text-gray-400 text-sm">
                Nessun rider attivo registrato.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
