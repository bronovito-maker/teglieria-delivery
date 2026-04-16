"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatTime, formatOrderCode } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/constants";
import RiderRouteMap from "@/components/rider/RiderRouteMap";

export default function RiderOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [riderVehicle, setRiderVehicle] = useState<"BIKE" | "SCOOTER" | "CAR" | null>(null);
  const [eventNote, setEventNote] = useState("");
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState("");

  const QUICK_EVENTS = [
    "Cliente non risponde al telefono",
    "Ritardo traffico in corso",
    "Indirizzo difficile da trovare",
    "Consegna effettuata al portone",
  ];

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/ordini/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/rider/login?next=/rider/ordine/${id}`);
      } else {
        setUser(user);
        try {
          const profileRes = await fetch("/api/rider/profile");
          if (profileRes.ok) {
            const profile = await profileRes.json();
            if (profile?.vehicle) setRiderVehicle(profile.vehicle);
          }
        } catch {}
        await fetchOrder();
        interval = setInterval(fetchOrder, 7000);
      }
    }
    checkAuth();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchOrder, id, router, supabase]);

  async function handleAssign() {
    if (!user) return;
    setAssigning(true);
    
    const riderRes = await fetch("/api/rider/profile");
    if (!riderRes.ok) {
      alert("Profilo rider non trovato.");
      setAssigning(false);
      return;
    }
    const rider = await riderRes.json();

    const payload: Record<string, string> = {
      riderId: rider.id,
      statusNote: "[RIDER] Presa in carico ordine",
    };
    if (order.status === "READY") {
      payload.status = "OUT";
      payload.deliveryStatus = "EN_ROUTE";
    } else {
      payload.deliveryStatus = "ASSIGNED";
    }

    const res = await fetch(`/api/ordini/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      fetchOrder();
    } else {
      alert("Errore durante l'assegnazione.");
    }
    setAssigning(false);
  }

  async function handleStartDelivery() {
    setAssigning(true);
    const res = await fetch(`/api/ordini/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "OUT",
        deliveryStatus: "EN_ROUTE",
        statusNote: "[RIDER] Partito per la consegna",
      }),
    });
    if (res.ok) fetchOrder();
    setAssigning(false);
  }

  async function handleDelivered() {
    setAssigning(true);
    const res = await fetch(`/api/ordini/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "DELIVERED",
        deliveryStatus: "DELIVERED",
        actualTime: new Date().toISOString(),
        statusNote: "[RIDER] Consegna completata",
      }),
    });
    if (res.ok) fetchOrder();
    setAssigning(false);
  }

  async function sendRiderEvent(note: string) {
    if (!note.trim()) return;
    setEventLoading(true);
    setEventError("");

    const res = await fetch(`/api/ordini/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        statusNote: `[RIDER] ${note.trim()}`,
      }),
    });

    if (!res.ok) {
      setEventError("Impossibile salvare l'evento operativo");
      setEventLoading(false);
      return;
    }

    setEventNote("");
    setEventLoading(false);
    fetchOrder();
  }

  if (loading) return <div className="p-8 text-center text-gray-500 font-brand uppercase tracking-widest text-xs">Caricamento ordine...</div>;
  if (!order) return <div className="p-8 text-center text-terracotta font-brand font-bold uppercase tracking-widest text-xs">Ordine non trovato o non disponibile.</div>;

  return (
    <div className="min-h-screen bg-warm-light pb-28 pt-8 px-4 animate-in fade-in duration-700">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex flex-col gap-4 reveal active">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Ordine in Carico</span>
              <h1 className="text-4xl font-display tracking-tight text-charcoal">
                #{formatOrderCode(order)} <span className="text-terracotta">Status.</span>
              </h1>
            </div>
            <span className={`px-6 py-2 rounded-full text-[10px] font-brand font-bold uppercase tracking-widest border shadow-sm transition-all duration-500 ${
              order.status === "DELIVERED" ? "bg-green-50 text-green-600 border-green-100" :
              order.status === "OUT" ? "bg-terracotta text-white border-terracotta animate-pulse" :
              "bg-marigold text-white border-marigold"
            }`}>
              {ORDER_STATUS_LABELS[order.status] || order.status}
            </span>
          </div>
        </header>

        {order.type === "DELIVERY" && order.address && (
          <RiderRouteMap
            address={order.address}
            addressDetail={order.addressDetail}
            vehicle={riderVehicle}
          />
        )}

        <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
          <div className="p-10 space-y-10">
            <section className="relative">
              <span className="text-[9px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/30 mb-3 block">Destinatario</span>
              <p className="text-3xl font-display text-charcoal">{order.customerName}</p>
              <a href={`tel:${order.customerPhone}`} className="inline-flex items-center gap-2 mt-3 px-6 py-3 bg-warm-light rounded-full text-[11px] font-brand font-bold uppercase tracking-widest text-charcoal hover:bg-charcoal hover:text-white transition-all">
                <span>📞</span> Chiama Cliente
              </a>
            </section>

            <section>
              <span className="text-[9px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/30 mb-3 block">Logistica Consegna</span>
              <div className="flex items-start gap-4">
                <div className="w-2 h-2 rounded-full bg-terracotta mt-2 flex-shrink-0" />
                <div>
                  <p className="text-2xl font-display text-charcoal leading-tight">{order.address}</p>
                  {order.addressDetail && <p className="font-body italic text-sm text-charcoal/50 mt-2">&quot;{order.addressDetail}&quot;</p>}
                  {order.deliveryZone && (
                    <div className="mt-4 inline-block px-4 py-1.5 bg-charcoal rounded-full text-[8px] font-brand font-bold uppercase tracking-widest text-white/60">
                      Settore: {order.deliveryZone}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-warm-light/40 rounded-[2rem] border border-charcoal/5">
                <span className="text-[8px] font-brand font-bold uppercase tracking-widest text-charcoal/40 mb-2 block">Orario Stimato</span>
                <p className="text-2xl font-brand font-bold text-charcoal">
                  {order.estimatedTime ? formatTime(order.estimatedTime) : order.pickupTime}
                </p>
              </div>
              <div className="p-6 bg-charcoal rounded-[2rem] shadow-xl text-center">
                <span className="text-[8px] font-brand font-bold uppercase tracking-widest text-white/40 mb-2 block">Importo Incasso</span>
                <p className="text-2xl font-brand font-bold text-white">
                  {formatCurrency(Number(order.total))}
                </p>
              </div>
            </section>

            {order.notes && (
              <section className="p-6 bg-marigold/5 rounded-[2rem] border border-marigold/20">
                 <span className="text-[8px] font-brand font-bold uppercase tracking-widest text-marigold mb-2 block">Note Critiche</span>
                 <p className="font-body italic text-sm text-charcoal/70 leading-relaxed">&quot;{order.notes}&quot;</p>
              </section>
            )}
          </div>
        </div>

        <div className="space-y-4 reveal active">
          {order.riderId ? (
            <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-8 text-center border border-charcoal/5 shadow-sm">
              <p className="text-[10px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal/60">
                {order.rider?.authUserId === user?.id 
                  ? "Consegna correttamente assegnata a te" 
                  : `In carico a: ${order.rider?.name}`}
              </p>
            </div>
          ) : (
            <button
              onClick={handleAssign}
              disabled={assigning}
              className="w-full py-8 bg-charcoal text-white rounded-[2.5rem] font-brand font-bold uppercase tracking-[0.4em] text-xs shadow-2xl shadow-charcoal/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {assigning ? "Registrazione..." : "Accetta Consegna"}
            </button>
          )}

          {order.rider?.authUserId === user?.id && order.status === "READY" && (
            <button
              onClick={handleStartDelivery}
              disabled={assigning}
              className="w-full py-8 bg-terracotta text-white rounded-[2.5rem] font-brand font-bold uppercase tracking-[0.4em] text-xs shadow-2xl shadow-terracotta/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {assigning ? "Aggiornamento..." : "Inizia Consegna"}
            </button>
          )}

          {order.rider?.authUserId === user?.id && order.status === "OUT" && (
            <button
              onClick={handleDelivered}
              disabled={assigning}
              className="w-full py-8 bg-white text-charcoal border-2 border-charcoal rounded-[2.5rem] font-brand font-bold uppercase tracking-[0.4em] text-xs shadow-2xl hover:bg-warm-light active:scale-95 transition-all disabled:opacity-50"
            >
              {assigning ? "Chiusura..." : "Ordine Consegnato"}
            </button>
          )}
        </div>

        {order.rider?.authUserId === user?.id && order.status !== "DELIVERED" && (
          <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
             <div className="px-10 py-6 border-b border-charcoal/5 bg-warm-light/20">
                <h2 className="text-[9px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal">Report Operativo</h2>
              </div>
            <div className="p-10 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {QUICK_EVENTS.map((quickEvent) => (
                  <button
                    key={quickEvent}
                    type="button"
                    onClick={() => sendRiderEvent(quickEvent)}
                    disabled={eventLoading}
                    className="px-6 py-4 rounded-2xl border border-charcoal/10 bg-warm-light/30 text-charcoal/60 text-[10px] font-brand font-bold uppercase tracking-widest hover:bg-charcoal hover:text-white hover:border-charcoal disabled:opacity-50 transition-all text-left"
                  >
                    {quickEvent}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <textarea
                  value={eventNote}
                  onChange={(e) => setEventNote(e.target.value)}
                  rows={2}
                  placeholder="Annotazione libera..."
                  className="w-full px-8 py-6 bg-white border border-charcoal/10 rounded-[2rem] font-body italic text-sm text-charcoal focus:ring-4 focus:ring-terracotta/5 outline-none transition-all placeholder:text-charcoal/20 shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => sendRiderEvent(eventNote)}
                  disabled={eventLoading || !eventNote.trim()}
                  className="w-full py-6 bg-charcoal/5 border border-charcoal/10 text-charcoal rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] hover:bg-charcoal hover:text-white transition-all disabled:opacity-50"
                >
                  {eventLoading ? "Trasmissione..." : "Invia Nota Operativa"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
          <div className="px-10 py-6 border-b border-charcoal/5 bg-warm-light/20">
             <h2 className="text-[9px] font-brand font-bold uppercase tracking-[0.2em] text-charcoal">Timeline Attività</h2>
          </div>
          <div className="p-10 space-y-4">
            {order.statusHistory?.slice(-8).reverse().map((log: any) => (
              <div key={log.id} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-warm-light/30 transition-colors">
                <div className="mt-1">
                   <div className={`w-2 h-2 rounded-full ${ORDER_STATUS_COLORS[log.status]?.includes('tomato') ? 'bg-terracotta' : 'bg-charcoal/20'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal">
                      {ORDER_STATUS_LABELS[log.status] || log.status}
                    </span>
                    <span className="text-[9px] font-brand font-bold italic text-charcoal/30">{formatTime(log.createdAt)}</span>
                  </div>
                  {log.note && <p className="font-body italic text-[11px] text-charcoal/50">{log.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => router.back()}
          className="w-full py-10 text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-charcoal/30 hover:text-terracotta transition-colors"
        >
          &larr; Torna alla Dashboard
        </button>
      </div>
    </div>
  );
}
