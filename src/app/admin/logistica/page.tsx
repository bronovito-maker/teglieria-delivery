"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatCurrency, formatOrderCode } from "@/lib/utils";
import type { OrderWithItems } from "@/types";
import LogisticsMap from "@/components/admin/LogisticsMap";

type RiderVehicleValue = "BIKE" | "SCOOTER" | "CAR";

type RiderSummary = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  vehicle: RiderVehicleValue;
  zone?: string | null;
  orders: Array<{
    id: string;
    orderNumber: number;
    status: string;
    createdAt: string;
    timeSlot?: string | null;
  }>;
  metrics: {
    activeOrders: number;
    deliveredCount: number;
    deliveredTodayCount: number;
    deliveredRevenue: number;
    deliveredTodayRevenue: number;
    totalPizzasDelivered: number;
    averageTicket: number;
    estimatedCompensation: number;
    netAfterRiderCompensation: number;
    avgDeliveryMinutes: number | null;
  };
};

const VEHICLE_LABELS: Record<RiderVehicleValue, string> = {
  BIKE: "Bici",
  SCOOTER: "Scooter",
  CAR: "Auto",
};

type DispatchSuggestion = {
  riderId: string;
  riderName: string;
  score: number;
  reasons: string[];
};

type CriticalRiderAlert = {
  logId: string;
  orderId: string;
  orderNumber: number;
  orderCode?: string | null;
  customerName: string;
  message: string;
  createdAt: string;
};

const DELIVERY_ACTIVE_STATUSES = ["CONFIRMED", "READY", "OUT"] as const;
const SLA_WARNING_MINUTES = 30;
const SLA_CRITICAL_MINUTES = 40;
const SLA_URGENT_MINUTES = 50;

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

function getDispatchSuggestion(order: OrderWithItems, riders: RiderSummary[]): DispatchSuggestion | null {
  const availableRiders = riders.filter((rider) => rider.active);
  if (availableRiders.length === 0) return null;

  const ranked = availableRiders.map((rider) => {
    let score = 100;
    const reasons: string[] = [];

    const activeLoad = rider.metrics.activeOrders;
    score -= activeLoad * 28;
    reasons.push(`carico attivo: ${activeLoad}`);

    const hasOutOrder = rider.orders.some((activeOrder) => activeOrder.status === "OUT");
    if (hasOutOrder) {
      score -= 12;
      reasons.push("già in consegna");
    }

    const deliveredToday = rider.metrics.deliveredTodayCount;
    score += Math.min(deliveredToday, 6) * 2;
    reasons.push(`evasi oggi: ${deliveredToday}`);

    const deliveryKm = Number(order.deliveryKm ?? 0);
    if (deliveryKm >= 4 && rider.metrics.totalPizzasDelivered >= 50) {
      score += 6;
      reasons.push("profilo esperto su tratte lunghe");
    }

    if (order.riderId === rider.id) {
      score += 4;
      reasons.push("continuità con assegnazione attuale");
    }

    // Mezzo vs distanza
    if (deliveryKm >= 5 && rider.vehicle === "BIKE") {
      score -= 25;
      reasons.push("mezzo poco adatto alla tratta");
    } else if (deliveryKm >= 8 && rider.vehicle === "SCOOTER") {
      score -= 8;
      reasons.push("tratta lunga per scooter");
    } else if (rider.vehicle === "CAR" && deliveryKm >= 5) {
      score += 6;
      reasons.push("auto ideale su tratta lunga");
    }

    // Velocità media
    if (rider.metrics.avgDeliveryMinutes != null) {
      const bonus = Math.max(0, 30 - rider.metrics.avgDeliveryMinutes) * 0.5;
      if (bonus > 0) {
        score += bonus;
        reasons.push(`media ${rider.metrics.avgDeliveryMinutes}′`);
      }
    }

    // Zona
    if (
      rider.zone &&
      order.deliveryZone &&
      rider.zone.trim().toLowerCase() === order.deliveryZone.trim().toLowerCase()
    ) {
      score += 10;
      reasons.push("zona di competenza");
    }

    // Fascia oraria
    if (order.timeSlot) {
      const sameSlot = rider.orders.filter((o) => o.timeSlot === order.timeSlot).length;
      if (sameSlot === 1) {
        score += 4;
        reasons.push("batching fascia");
      } else if (sameSlot >= 2) {
        score -= 10;
        reasons.push("saturo fascia");
      }
    }

    return {
      riderId: rider.id,
      riderName: rider.name,
      score,
      reasons,
    };
  });

  ranked.sort((a, b) => b.score - a.score);
  return ranked[0] ?? null;
}

function isCriticalRiderNote(note?: string | null): boolean {
  if (!note || !note.startsWith("[RIDER]")) return false;
  const normalized = note.toLowerCase();
  return (
    normalized.includes("non risponde") ||
    normalized.includes("ritardo") ||
    normalized.includes("difficile") ||
    normalized.includes("fallita")
  );
}

export default function LogisticaPage() {
  const [allDeliveryOrders, setAllDeliveryOrders] = useState<OrderWithItems[]>([]);
  const [riders, setRiders] = useState<RiderSummary[]>([]);
  const [selectedRider, setSelectedRider] = useState<Record<string, string>>({});
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const [newRiderName, setNewRiderName] = useState("");
  const [newRiderPhone, setNewRiderPhone] = useState("");
  const [newRiderEmail, setNewRiderEmail] = useState("");
  const [newRiderVehicle, setNewRiderVehicle] = useState<RiderVehicleValue>("SCOOTER");
  const [newRiderZone, setNewRiderZone] = useState("");
  const [savingRider, setSavingRider] = useState(false);
  const [criticalAlerts, setCriticalAlerts] = useState<CriticalRiderAlert[]>([]);
  const knownAlertLogIdsRef = useRef<Set<string>>(new Set());
  const alertAudioRef = useRef<HTMLAudioElement | null>(null);

  const fetchData = useCallback(async () => {
    const today = new Date().toISOString().split("T")[0];
    const [ordersRes, ridersRes] = await Promise.all([
      fetch(`/api/ordini?date=${today}&type=DELIVERY`),
      fetch("/api/riders"),
    ]);

    if (ordersRes.ok) {
      const data: OrderWithItems[] = await ordersRes.json();
      setAllDeliveryOrders(data);
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
    const activeOrders = allDeliveryOrders.filter((order) =>
      DELIVERY_ACTIVE_STATUSES.includes(order.status as (typeof DELIVERY_ACTIVE_STATUSES)[number])
    );
    const assigned = activeOrders.filter((o) => Boolean(o.riderId)).length;
    const out = activeOrders.filter((o) => o.status === "OUT").length;
    const pending = activeOrders.length - assigned;

    const deliveredOrders = allDeliveryOrders.filter((order) => order.status === "DELIVERED");
    const deliveredWithDuration = deliveredOrders
      .map((order) => {
        const outLog = order.statusHistory.find((log) => log.status === "OUT");
        if (!outLog || !order.actualTime) return null;
        const diffMs = new Date(order.actualTime).getTime() - new Date(outLog.createdAt).getTime();
        return diffMs > 0 ? diffMs : null;
      })
      .filter((value): value is number => value !== null);

    const avgDeliveryMs = deliveredWithDuration.length
      ? deliveredWithDuration.reduce((sum, value) => sum + value, 0) / deliveredWithDuration.length
      : 0;

    const totalDeliveredByRiders = riders.reduce((sum, rider) => sum + rider.metrics.deliveredCount, 0);
    const now = Date.now();
    const deliveryTimersMinutes = activeOrders
      .map((order) => {
        const outLog = order.statusHistory.find((log) => log.status === "OUT");
        if (!outLog) return null;
        return (now - new Date(outLog.createdAt).getTime()) / 60000;
      })
      .filter((value): value is number => value !== null);

    const atRisk30 = deliveryTimersMinutes.filter((minutes) => minutes >= SLA_WARNING_MINUTES).length;
    const atRisk40 = deliveryTimersMinutes.filter((minutes) => minutes >= SLA_CRITICAL_MINUTES).length;
    const atRisk50 = deliveryTimersMinutes.filter((minutes) => minutes >= SLA_URGENT_MINUTES).length;

    return { assigned, out, pending, avgDeliveryMs, totalDeliveredByRiders, atRisk30, atRisk40, atRisk50 };
  }, [allDeliveryOrders, riders]);

  const activeOrders = useMemo(
    () =>
      allDeliveryOrders.filter((order) =>
        DELIVERY_ACTIVE_STATUSES.includes(order.status as (typeof DELIVERY_ACTIVE_STATUSES)[number])
      ),
    [allDeliveryOrders]
  );

  const dispatchSuggestions = useMemo(() => {
    return Object.fromEntries(
      activeOrders.map((order) => [order.id, getDispatchSuggestion(order, riders)])
    ) as Record<string, DispatchSuggestion | null>;
  }, [activeOrders, riders]);

  const mapOrders = useMemo(
    () =>
      activeOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        orderCode: order.orderCode,
        type: order.type,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        address: order.address,
        status: order.status,
        createdAt: order.createdAt ? new Date(order.createdAt).toISOString() : null,
        estimatedTime: order.estimatedTime ? new Date(order.estimatedTime).toISOString() : null,
        riderName: order.rider?.name ?? null,
      })),
    [activeOrders]
  );

  useEffect(() => {
    const nextAlerts: CriticalRiderAlert[] = [];
    for (const order of allDeliveryOrders) {
      for (const log of order.statusHistory) {
        if (!isCriticalRiderNote(log.note)) continue;
        if (knownAlertLogIdsRef.current.has(log.id)) continue;
        knownAlertLogIdsRef.current.add(log.id);
        nextAlerts.push({
          logId: log.id,
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderCode: order.orderCode,
          customerName: order.customerName,
          message: log.note?.replace("[RIDER] ", "") || "Evento rider critico",
          createdAt: new Date(log.createdAt).toISOString(),
        });
      }
    }

    if (nextAlerts.length > 0) {
      setCriticalAlerts((prev) =>
        [...nextAlerts, ...prev].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      );
      alertAudioRef.current?.play().catch(() => {});
    }
  }, [allDeliveryOrders]);

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

  async function createRider() {
    if (!newRiderName.trim()) return;
    setSavingRider(true);

    const res = await fetch("/api/riders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newRiderName,
        phone: newRiderPhone,
        email: newRiderEmail,
        vehicle: newRiderVehicle,
        zone: newRiderZone,
      }),
    });

    if (res.ok) {
      setNewRiderName("");
      setNewRiderPhone("");
      setNewRiderEmail("");
      setNewRiderVehicle("SCOOTER");
      setNewRiderZone("");
      fetchData();
    }

    setSavingRider(false);
  }

  async function toggleRiderActive(rider: RiderSummary) {
    setSavingRider(true);
    await fetch(`/api/riders/${rider.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rider.active }),
    });
    setSavingRider(false);
    fetchData();
  }

  async function removeRider(rider: RiderSummary) {
    const ok = window.confirm(
      `Licenziare ${rider.name}?\n\nIl profilo verrà eliminato definitivamente, l'accesso all'app revocato e tutti gli ordini verranno sganciati.\n\nQuesta operazione non è reversibile.`
    );
    if (!ok) return;

    setSavingRider(true);
    await fetch(`/api/riders/${rider.id}`, { method: "DELETE" });
    setSavingRider(false);
    fetchData();
  }

  function getDeliveryTimer(order: OrderWithItems): string {
    const outLog = order.statusHistory.find((log) => log.status === "OUT");
    if (!outLog) return "--:--";
    return formatDuration(nowTick - new Date(outLog.createdAt).getTime());
  }

  function getDeliveryTimerMinutes(order: OrderWithItems): number | null {
    const outLog = order.statusHistory.find((log) => log.status === "OUT");
    if (!outLog) return null;
    return (nowTick - new Date(outLog.createdAt).getTime()) / 60000;
  }

  function getSlaToneClass(minutes: number | null): string {
    if (minutes === null) return "text-[#cf2a1d]";
    if (minutes >= SLA_URGENT_MINUTES) return "text-red-700";
    if (minutes >= SLA_CRITICAL_MINUTES) return "text-orange-700";
    if (minutes >= SLA_WARNING_MINUTES) return "text-amber-700";
    return "text-[#cf2a1d]";
  }

  function getSlaLabel(minutes: number | null): string | null {
    if (minutes === null) return null;
    if (minutes >= SLA_URGENT_MINUTES) return "Urgente 50+";
    if (minutes >= SLA_CRITICAL_MINUTES) return "Critico 40+";
    if (minutes >= SLA_WARNING_MINUTES) return "A rischio 30+";
    return null;
  }

  function dismissAlert(logId: string) {
    setCriticalAlerts((prev) => prev.filter((alert) => alert.logId !== logId));
  }

  function dismissAllAlerts() {
    setCriticalAlerts([]);
  }

  return (
    <div className="max-w-7xl animate-in fade-in duration-700">
      <audio ref={alertAudioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdH+Jj4+Lh4J/fH5+goaIiYiGgoB9fH1/goaIioqIhoJ/fHx+gYWIioqIhoJ+fHx+gYWIioqIhoN+fHt9gIWIiomHhIF+fHx+gYWHiYiHhYJ/fXx9f4KFh4iHhYOAfnx8foCDhoiHhoSBf319foGEhoeGhYOBf359f4GEhoaGhIKAf359foCDhYaFhIOBf35+foCChYWFhIOBf359foGDhIWEg4KAf35+foCChIWEg4KAf35+fn+ChISEg4F/fn5+f4GDhISDgoB/fn1+f4GDg4ODgYB/fn5+f4GCg4OCgYB/fn5+f4GCg4OCgYB/fn5+foGCgoKBgH9/fn5+f4GCgoKBgH9+fn5+f4GBgoGAgH9+fn5+f4GBgYGAgH9+fn5/f4CBAAAAAIAAAACAf4B/gH+Af4B/gICAgICAgICAgICAgA==" type="audio/wav" />
      </audio>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-10">
        <div className="reveal active">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Dipartimento</span>
          <h1 className="text-5xl md:text-6xl font-display tracking-tight text-charcoal">
            Logistica <span className="text-terracotta">Rider.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-2 tracking-widest uppercase text-[10px]">Monitoraggio e assegnazione in tempo reale</p>
        </div>
        <button
          onClick={fetchData}
          className="w-fit px-8 py-4 bg-white border border-charcoal/5 text-charcoal rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-sm hover:bg-warm-light transition-all active:scale-95">
          Sincronizza Dati
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4 mb-10">
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-charcoal/5 p-5 shadow-sm reveal active flex flex-col">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 min-h-[2.5rem] flex items-start">Da assegnare</p>
          <p className="text-3xl font-brand font-bold text-terracotta">{kpis.pending}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-charcoal/5 p-5 shadow-sm reveal active flex flex-col">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 min-h-[2.5rem] flex items-start">Assegnati</p>
          <p className="text-3xl font-brand font-bold text-charcoal">{kpis.assigned}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-charcoal/5 p-5 shadow-sm reveal active flex flex-col">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 min-h-[2.5rem] flex items-start">In consegna</p>
          <p className="text-3xl font-brand font-bold text-charcoal">{kpis.out}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-charcoal/5 p-5 shadow-sm reveal active flex flex-col items-center text-center">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 min-h-[2.5rem] flex items-start">Tempo medio</p>
          <p className="text-3xl font-brand font-bold text-terracotta leading-none">{formatDuration(kpis.avgDeliveryMs)}</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-charcoal/5 p-5 shadow-sm reveal active flex flex-col">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 min-h-[2.5rem] flex items-start">Resa Rider</p>
          <p className="text-3xl font-brand font-bold text-charcoal">{kpis.totalDeliveredByRiders}</p>
        </div>
        <div className="bg-warm-light/50 backdrop-blur-xl rounded-2xl border border-marigold/20 p-5 shadow-sm reveal active flex flex-col">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-marigold min-h-[2.5rem] flex items-start">SLA 30+</p>
          <p className="text-3xl font-brand font-bold text-marigold">{kpis.atRisk30}</p>
        </div>
        <div className="bg-warm-light/50 backdrop-blur-xl rounded-2xl border border-terracotta/20 p-5 shadow-sm reveal active flex flex-col">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-terracotta min-h-[2.5rem] flex items-start">SLA 40+</p>
          <p className="text-3xl font-brand font-bold text-terracotta">{kpis.atRisk40}</p>
        </div>
        <div className="bg-terracotta/5 backdrop-blur-xl rounded-2xl border border-terracotta/30 p-5 shadow-sm reveal active flex flex-col">
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-terracotta min-h-[2.5rem] flex items-start">SLA 50+</p>
          <p className="text-3xl font-brand font-bold text-terracotta animate-pulse">{kpis.atRisk50}</p>
        </div>
      </div>

      {criticalAlerts.length > 0 && (
        <div className="mb-12 bg-white/40 backdrop-blur-3xl rounded-[3rem] border border-terracotta/20 p-10 reveal active">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-10">
            <div>
              <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta mb-2 block">Alert Operativi</span>
              <h3 className="text-4xl font-display tracking-tight text-charcoal">Eventi Rider <span className="text-terracotta">Critici.</span></h3>
            </div>
            <button
              type="button"
              onClick={dismissAllAlerts}
              className="px-8 py-3 bg-white border border-terracotta/20 text-terracotta rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-terracotta hover:text-white transition-all shadow-sm"
            >
              Archivia Tutti
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalAlerts.slice(0, 6).map((alert) => (
              <div key={alert.logId} className="bg-white/80 p-6 rounded-3xl border border-terracotta/5 flex items-start justify-between gap-4 group hover:border-terracotta/20 transition-all">
                <div className="flex-1">
                  <p className="font-brand font-bold text-sm tracking-tight text-charcoal flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-terracotta animate-pulse" />
                    Ordine #{formatOrderCode({ orderCode: alert.orderCode, orderNumber: alert.orderNumber, type: "DELIVERY" })} • {alert.customerName}
                  </p>
                  <p className="font-body italic text-xs text-terracotta/80 mt-1">{alert.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => dismissAlert(alert.logId)}
                  className="font-brand font-bold uppercase tracking-widest text-[9px] text-charcoal/20 hover:text-charcoal transition-colors p-2"
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-4">
        <LogisticsMap orders={mapOrders} onStatusChange={fetchData} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-12">
        <section className="xl:col-span-2 bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
          <div className="px-10 py-8 border-b border-charcoal/5 bg-warm-light/20 flex items-center justify-between">
            <h2 className="font-brand font-bold uppercase tracking-[0.2em] text-xs text-charcoal">Ordini Delivery Operativi</h2>
            <span className="bg-terracotta text-white px-3 py-1 rounded-full text-[9px] font-brand font-bold tracking-widest">{activeOrders.length} Attivi</span>
          </div>
          <div className="p-8 space-y-4">
            {activeOrders.map((order) => {
              const riderDisplay = order.rider?.name || "Non assegnato";
              const timer = getDeliveryTimer(order);
              const timerMinutes = getDeliveryTimerMinutes(order);
              const slaLabel = getSlaLabel(timerMinutes);
              const latestRiderEvent = [...order.statusHistory]
                .reverse()
                .find((log) => typeof log.note === "string" && log.note.startsWith("[RIDER]"));
              const suggestion = dispatchSuggestions[order.id];
              const effectiveSelectedRider = selectedRider[order.id] ?? order.riderId ?? suggestion?.riderId ?? "";
              return (
                <div key={order.id} className="rounded-[2.5rem] border border-charcoal/5 bg-white p-8 transition-all hover:shadow-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div>
                      <p className="font-brand font-bold text-xl tracking-tight text-charcoal">#{formatOrderCode(order)} • {order.customerName}</p>
                      <p className="font-body italic text-xs text-charcoal/40 mt-1">{order.address || "Indirizzo non presente"}</p>
                    </div>
                    <span className={`px-5 py-2 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest border ${ORDER_STATUS_COLORS[order.status]}`}>
                      {ORDER_STATUS_LABELS[order.status]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm mb-8">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/20 mb-1">Rider</p>
                      <p className="font-brand font-bold text-charcoal">{riderDisplay}</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/20 mb-1">Importo</p>
                      <p className="font-brand font-bold text-charcoal">{Number(order.total).toFixed(2)} €</p>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/20 mb-1">⏱️ Timer</p>
                      <p className={`font-brand font-bold text-lg ${getSlaToneClass(timerMinutes)}`}>{timer}</p>
                    </div>
                  </div>

                  {slaLabel && (
                    <div className="mb-6">
                      <span className={`inline-flex items-center rounded-full px-5 py-2 text-[9px] font-brand font-bold uppercase tracking-widest ${
                        timerMinutes !== null && timerMinutes >= SLA_URGENT_MINUTES
                          ? "bg-terracotta text-white"
                          : timerMinutes !== null && timerMinutes >= SLA_CRITICAL_MINUTES
                          ? "bg-terracotta/80 text-white"
                          : "bg-marigold text-white"
                      }`}>
                        ⚠ {slaLabel}
                      </span>
                    </div>
                  )}

                  {suggestion && (
                    <div className="mb-6 rounded-3xl border border-charcoal/5 bg-warm-light/30 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-[9px] uppercase font-brand font-bold text-terracotta tracking-[0.2em] mb-1">Suggerimento Smart:</p>
                        <p className="font-brand font-bold text-charcoal text-sm">{suggestion.riderName} <span className="text-charcoal/40 font-normal ml-2">Score: {suggestion.score}</span></p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedRider((prev) => ({ ...prev, [order.id]: suggestion.riderId }))}
                        className="px-6 py-2 bg-white border border-charcoal/5 text-charcoal rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-terracotta hover:text-white transition-all transition-all"
                      >
                        Applica
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-charcoal/5">
                    <select
                      value={effectiveSelectedRider}
                      onChange={(e) => setSelectedRider((prev) => ({ ...prev, [order.id]: e.target.value }))}
                      className="flex-1 px-6 py-4 bg-white border border-charcoal/10 rounded-full font-brand font-bold uppercase tracking-widest text-[10px] focus:ring-2 focus:ring-terracotta/20 outline-none transition-all"
                    >
                      <option value="">Seleziona Fattore...</option>
                      {riders
                        .filter((rider) => rider.active || rider.id === order.riderId)
                        .map((rider) => (
                          <option key={rider.id} value={rider.id}>
                            {rider.name}{rider.active ? "" : " (STOP)"}
                          </option>
                        ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => assignOrder(order)}
                      disabled={savingOrderId === order.id}
                      className="px-10 py-4 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-xl hover:bg-terracotta transition-all disabled:opacity-50"
                    >
                      {savingOrderId === order.id ? "..." : order.riderId ? "Invia" : "Assegna"}
                    </button>

                    {order.status === "OUT" && (
                      <button
                        type="button"
                        onClick={() => completeDelivery(order)}
                        disabled={savingOrderId === order.id}
                        className="px-10 py-4 bg-white border-2 border-charcoal text-charcoal rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-charcoal hover:text-white transition-all"
                      >
                        Consegnato
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {activeOrders.length === 0 && (
              <div className="py-20 text-center">
                <p className="font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20 text-xs">Nessun ordine attivo al momento.</p>
              </div>
            )}
          </div>
        </section>

        <section className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl p-10 h-fit reveal active">
          <div className="mb-10">
            <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Nuovo Account</span>
            <h2 className="text-3xl font-brand font-medium tracking-tight text-charcoal uppercase">Reclutamento <span className="text-terracotta">Rider.</span></h2>
          </div>
          <div className="space-y-4">
            <div className="space-y-1">
               <label className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 ml-4">Nome e Cognome</label>
               <input
                value={newRiderName}
                onChange={(e) => setNewRiderName(e.target.value)}
                className="w-full px-8 py-4 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 outline-none transition-all"
              />
            </div>
             <div className="space-y-1">
               <label className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 ml-4">Recapito Telefonico</label>
               <input
                value={newRiderPhone}
                onChange={(e) => setNewRiderPhone(e.target.value)}
                className="w-full px-8 py-4 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 outline-none transition-all"
              />
            </div>
             <div className="space-y-1">
               <label className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 ml-4">Email Personale</label>
               <input
                value={newRiderEmail}
                onChange={(e) => setNewRiderEmail(e.target.value)}
                className="w-full px-8 py-4 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 outline-none transition-all"
              />
            </div>
             <div className="space-y-1">
               <label className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 ml-4">Mezzo</label>
               <select
                value={newRiderVehicle}
                onChange={(e) => setNewRiderVehicle(e.target.value as RiderVehicleValue)}
                className="w-full px-8 py-4 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="BIKE">Bici</option>
                <option value="SCOOTER">Scooter</option>
                <option value="CAR">Auto</option>
              </select>
            </div>
             <div className="space-y-1">
               <label className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 ml-4">Zona di competenza</label>
               <input
                value={newRiderZone}
                onChange={(e) => setNewRiderZone(e.target.value)}
                placeholder="Es. Centro, Zona Nord"
                className="w-full px-8 py-4 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 outline-none transition-all"
              />
            </div>
            <button
              type="button"
              onClick={createRider}
              disabled={savingRider || !newRiderName.trim()}
              className="w-full mt-6 px-10 py-5 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl hover:bg-terracotta transition-all disabled:opacity-50"
            >
              {savingRider ? "Registrazione..." : "Crea Profilo Rider"}
            </button>
          </div>
        </section>
      </div>

      <section className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active mb-20">
        <div className="px-10 py-8 border-b border-charcoal/5 bg-warm-light/20 flex items-center justify-between">
          <div>
            <span className="text-[9px] font-brand font-bold uppercase tracking-[0.3em] text-terracotta/60 mb-1 block">Turno di oggi</span>
            <h2 className="font-brand font-bold uppercase tracking-tight text-charcoal text-lg">Situazione Fattorini</h2>
          </div>
          <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/30">{riders.length} rider registrati</span>
        </div>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {riders.map((rider) => {
            const riderOrders = allDeliveryOrders.filter((o) => o.riderId === rider.id);
            const activeRiderOrders = riderOrders.filter((o) =>
              DELIVERY_ACTIVE_STATUSES.includes(o.status as (typeof DELIVERY_ACTIVE_STATUSES)[number])
            );
            const deliveredRiderOrders = riderOrders.filter((o) => o.status === "DELIVERED");
            const totalTodayOrders = riderOrders.filter((o) => o.status !== "CANCELLED").length;

            const cashToDo = activeRiderOrders
              .filter((o) => String(o.paymentMethod) === "CONTANTI")
              .reduce((sum, o) => sum + Number(o.total), 0);

            const cashCollected = deliveredRiderOrders
              .filter((o) => String(o.paymentMethod) === "CONTANTI")
              .reduce((sum, o) => sum + Number(o.total), 0);

            const posCollected = deliveredRiderOrders
              .filter((o) => String(o.paymentMethod) === "CARTA")
              .reduce((sum, o) => sum + Number(o.total), 0);

            // Tempo medio calcolato sulle consegne di oggi (OUT → actualTime)
            const todayDeliveryTimes = deliveredRiderOrders
              .map((o) => {
                const outLog = o.statusHistory.find((l) => l.status === "OUT");
                if (!outLog || !o.actualTime) return null;
                const ms = new Date(o.actualTime).getTime() - new Date(outLog.createdAt).getTime();
                return ms > 0 ? Math.round(ms / 60000) : null;
              })
              .filter((v): v is number => v !== null);
            const avgTodayMinutes = todayDeliveryTimes.length
              ? Math.round(todayDeliveryTimes.reduce((s, v) => s + v, 0) / todayDeliveryTimes.length)
              : null;

            return (
              <div key={rider.id} className="rounded-[2.5rem] border border-charcoal/5 bg-white p-8 transition-all hover:border-terracotta/10 hover:shadow-md">

                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className="font-brand font-bold text-xl tracking-tight text-charcoal">{rider.name}</p>
                    <p className="font-body italic text-xs text-charcoal/40 mt-0.5">{rider.phone || "—"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-terracotta/10 text-terracotta text-[9px] font-brand font-bold uppercase tracking-widest border border-terracotta/20">
                        {VEHICLE_LABELS[rider.vehicle]}
                      </span>
                      {rider.zone && (
                        <span className="px-2.5 py-1 rounded-full bg-charcoal/5 text-charcoal/60 text-[9px] font-brand font-bold uppercase tracking-widest">
                          {rider.zone}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest ${
                    rider.active ? "bg-green-50 text-green-600 border border-green-100" : "bg-charcoal/5 text-charcoal/30 border border-charcoal/10"
                  }`}>
                    {rider.active ? "In Servizio" : "Non Attivo"}
                  </span>
                </div>

                {/* Statistiche turno */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-warm-light/40 rounded-2xl p-4 border border-charcoal/5 text-center">
                    <p className="text-[8px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 mb-1.5">Ordini oggi</p>
                    <p className="text-2xl font-brand font-bold text-charcoal">{totalTodayOrders}</p>
                    <p className="text-[8px] font-brand font-bold text-charcoal/25 mt-0.5">{rider.metrics.deliveredTodayCount} consegnati</p>
                  </div>
                  <div className="bg-warm-light/40 rounded-2xl p-4 border border-charcoal/5 text-center">
                    <p className="text-[8px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 mb-1.5">In giro</p>
                    <p className="text-2xl font-brand font-bold text-terracotta">{activeRiderOrders.length}</p>
                    <p className="text-[8px] font-brand font-bold text-charcoal/25 mt-0.5">attivi ora</p>
                  </div>
                  <div className="bg-warm-light/40 rounded-2xl p-4 border border-charcoal/5 text-center">
                    <p className="text-[8px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30 mb-1.5">Tempo medio</p>
                    <p className="text-2xl font-brand font-bold text-marigold">
                      {avgTodayMinutes != null ? `${avgTodayMinutes}′` : "—"}
                    </p>
                    <p className="text-[8px] font-brand font-bold text-charcoal/25 mt-0.5">oggi</p>
                  </div>
                </div>

                {/* Cassa — card unica con cash + POS integrato */}
                <div className="rounded-2xl p-5 border border-amber-200 bg-amber-50/70 mb-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <p className="text-[8px] uppercase tracking-[0.2em] font-brand font-bold text-amber-600 mb-1">Cash da versare a fine turno</p>
                      <p className="text-2xl font-brand font-bold text-amber-800">{formatCurrency(cashCollected + cashToDo)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-brand font-bold text-amber-500">
                        {formatCurrency(cashCollected)} <span className="font-normal text-amber-400">già in tasca</span>
                      </p>
                      <p className="text-[9px] font-brand font-bold text-amber-400">
                        {formatCurrency(cashToDo)} <span className="font-normal">ancora da ritirare</span>
                      </p>
                    </div>
                  </div>
                  {posCollected > 0 && (
                    <div className="pt-3 border-t border-amber-200/60 flex items-center justify-between">
                      <p className="text-[8px] uppercase tracking-[0.2em] font-brand font-bold text-blue-500">POS già elettronico</p>
                      <p className="text-sm font-brand font-bold text-blue-700">{formatCurrency(posCollected)}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => toggleRiderActive(rider)}
                    disabled={savingRider}
                    className="flex-1 py-3 bg-white border border-charcoal/10 text-charcoal rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-warm-light transition-all disabled:opacity-50"
                  >
                    {rider.active ? "Sospendi" : "Attiva"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeRider(rider)}
                    disabled={savingRider}
                    className="px-6 py-3 bg-red-50 text-red-400 rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[9px] hover:bg-red-500 hover:text-white transition-all disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          {riders.length === 0 && (
            <div className="col-span-full py-20 text-center">
              <p className="font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20 text-xs">Nessun rider configurato nel database.</p>
            </div>
          )}
        </div>
      </section>

      {/* STATISTICHE STORICHE RIDER */}
      {riders.length > 0 && (
        <section className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active mb-20">
          <div className="px-10 py-8 border-b border-charcoal/5 bg-warm-light/20 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-brand font-bold uppercase tracking-[0.3em] text-terracotta/60 mb-1 block">Tutti i tempi</span>
              <h2 className="font-brand font-bold uppercase tracking-tight text-charcoal text-lg">Statistiche <span className="text-terracotta">Storiche</span></h2>
            </div>
            <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/30">
              {riders.reduce((s, r) => s + r.metrics.deliveredCount, 0)} consegne totali
            </span>
          </div>

          {/* Tabella desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-charcoal/5 bg-warm-light/10">
                  <th className="text-left px-8 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">#</th>
                  <th className="text-left px-4 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Fattorino</th>
                  <th className="text-right px-4 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Consegne</th>
                  <th className="text-right px-4 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Fatturato</th>
                  <th className="text-right px-4 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Pizze</th>
                  <th className="text-right px-4 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Scontrino medio</th>
                  <th className="text-right px-4 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Tempo medio</th>
                  <th className="text-right px-4 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Compenso</th>
                  <th className="text-right px-8 py-4 text-[8px] font-brand font-bold uppercase tracking-[0.25em] text-charcoal/30">Netto store</th>
                </tr>
              </thead>
              <tbody>
                {[...riders]
                  .sort((a, b) => b.metrics.deliveredCount - a.metrics.deliveredCount)
                  .map((rider, idx) => {
                    const rank = idx + 1;
                    const rankColor = rank === 1 ? "text-marigold" : rank === 2 ? "text-charcoal/40" : rank === 3 ? "text-amber-700/60" : "text-charcoal/20";
                    return (
                      <tr key={rider.id} className="border-b border-charcoal/5 last:border-0 hover:bg-warm-light/20 transition-colors">
                        <td className={`px-8 py-5 font-brand font-bold text-lg ${rankColor}`}>{rank}</td>
                        <td className="px-4 py-5">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-brand font-bold text-sm text-charcoal">{rider.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8px] font-brand font-bold uppercase tracking-widest text-charcoal/30">{VEHICLE_LABELS[rider.vehicle]}</span>
                                {rider.zone && <span className="text-[8px] font-brand text-charcoal/20">· {rider.zone}</span>}
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-brand font-bold uppercase tracking-widest ${
                              rider.active ? "bg-green-50 text-green-500 border border-green-100" : "bg-charcoal/5 text-charcoal/25 border border-charcoal/10"
                            }`}>
                              {rider.active ? "Attivo" : "Stop"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <p className="font-brand font-bold text-xl text-charcoal">{rider.metrics.deliveredCount}</p>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <p className="font-brand font-bold text-sm text-charcoal">{formatCurrency(rider.metrics.deliveredRevenue)}</p>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <p className="font-brand font-bold text-sm text-charcoal">{rider.metrics.totalPizzasDelivered}</p>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <p className="font-brand font-bold text-sm text-charcoal">{formatCurrency(rider.metrics.averageTicket)}</p>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <p className={`font-brand font-bold text-sm ${rider.metrics.avgDeliveryMinutes != null && rider.metrics.avgDeliveryMinutes <= 25 ? "text-green-600" : rider.metrics.avgDeliveryMinutes != null && rider.metrics.avgDeliveryMinutes >= 35 ? "text-terracotta" : "text-marigold"}`}>
                            {rider.metrics.avgDeliveryMinutes != null ? `${rider.metrics.avgDeliveryMinutes}′` : "—"}
                          </p>
                        </td>
                        <td className="px-4 py-5 text-right">
                          <p className="font-brand font-bold text-sm text-terracotta">{formatCurrency(rider.metrics.estimatedCompensation)}</p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <p className="font-brand font-bold text-sm text-charcoal">{formatCurrency(rider.metrics.netAfterRiderCompensation)}</p>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-charcoal/10 bg-warm-light/20">
                  <td className="px-8 py-4" />
                  <td className="px-4 py-4">
                    <p className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Totale</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="font-brand font-bold text-sm text-charcoal">{riders.reduce((s, r) => s + r.metrics.deliveredCount, 0)}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="font-brand font-bold text-sm text-charcoal">{formatCurrency(riders.reduce((s, r) => s + r.metrics.deliveredRevenue, 0))}</p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className="font-brand font-bold text-sm text-charcoal">{riders.reduce((s, r) => s + r.metrics.totalPizzasDelivered, 0)}</p>
                  </td>
                  <td className="px-4 py-4" />
                  <td className="px-4 py-4" />
                  <td className="px-4 py-4 text-right">
                    <p className="font-brand font-bold text-sm text-terracotta">{formatCurrency(riders.reduce((s, r) => s + r.metrics.estimatedCompensation, 0))}</p>
                  </td>
                  <td className="px-8 py-4 text-right">
                    <p className="font-brand font-bold text-sm text-charcoal">{formatCurrency(riders.reduce((s, r) => s + r.metrics.netAfterRiderCompensation, 0))}</p>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Cards mobile */}
          <div className="md:hidden p-6 space-y-4">
            {[...riders]
              .sort((a, b) => b.metrics.deliveredCount - a.metrics.deliveredCount)
              .map((rider, idx) => {
                const rank = idx + 1;
                const rankColor = rank === 1 ? "text-marigold" : rank === 2 ? "text-charcoal/40" : rank === 3 ? "text-amber-700/60" : "text-charcoal/20";
                return (
                  <div key={rider.id} className="bg-white rounded-[2rem] border border-charcoal/5 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className={`font-brand font-bold text-2xl ${rankColor}`}>#{rank}</span>
                        <div>
                          <p className="font-brand font-bold text-base text-charcoal">{rider.name}</p>
                          <p className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/30">{VEHICLE_LABELS[rider.vehicle]}{rider.zone ? ` · ${rider.zone}` : ""}</p>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[8px] font-brand font-bold uppercase tracking-widest ${
                        rider.active ? "bg-green-50 text-green-500 border border-green-100" : "bg-charcoal/5 text-charcoal/25 border border-charcoal/10"
                      }`}>
                        {rider.active ? "Attivo" : "Stop"}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Consegne", value: rider.metrics.deliveredCount, color: "text-charcoal" },
                        { label: "Fatturato", value: formatCurrency(rider.metrics.deliveredRevenue), color: "text-charcoal" },
                        { label: "Pizze", value: rider.metrics.totalPizzasDelivered, color: "text-charcoal" },
                        { label: "Scontrino medio", value: formatCurrency(rider.metrics.averageTicket), color: "text-charcoal" },
                        { label: "Tempo medio", value: rider.metrics.avgDeliveryMinutes != null ? `${rider.metrics.avgDeliveryMinutes}′` : "—", color: "text-marigold" },
                        { label: "Compenso", value: formatCurrency(rider.metrics.estimatedCompensation), color: "text-terracotta" },
                      ].map((stat) => (
                        <div key={stat.label} className="bg-warm-light/40 rounded-xl p-3 border border-charcoal/5 text-center">
                          <p className="text-[7px] font-brand font-bold uppercase tracking-widest text-charcoal/30 mb-1">{stat.label}</p>
                          <p className={`font-brand font-bold text-sm ${stat.color}`}>{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </section>
      )}
    </div>
  );
}
