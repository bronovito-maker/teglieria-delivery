"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatTime } from "@/lib/utils";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS } from "@/lib/constants";

export default function RiderOrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [user, setUser] = useState<any>(null);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/ordini/${id}`);
    if (res.ok) {
      const data = await res.json();
      setOrder(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/rider/login?next=/rider/ordine/${id}`);
      } else {
        setUser(user);
        fetchOrder();
      }
    }
    checkAuth();
  }, [fetchOrder, id, router, supabase]);

  async function handleAssign() {
    if (!user) return;
    setAssigning(true);
    
    // First, find the Rider ID from the authUserId
    const riderRes = await fetch(`/api/rider/profile?authUserId=${user.id}`);
    if (!riderRes.ok) {
      alert("Profilo rider non trovato.");
      setAssigning(false);
      return;
    }
    const rider = await riderRes.json();

    const res = await fetch(`/api/ordini/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        riderId: rider.id,
        status: order.status === "READY" ? "OUT" : undefined
      }),
    });

    if (res.ok) {
      fetchOrder();
    } else {
      alert("Errore durante l'assegnazione.");
    }
    setAssigning(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Caricamento ordine...</div>;
  if (!order) return <div className="p-8 text-center text-red-500">Ordine non trovato o non disponibile.</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 p-4">
      <div className="max-w-xl mx-auto space-y-4">
        <header className="flex items-center justify-between mb-2">
          <h1 className="text-xl font-bold">Dettaglio Consegna #{order.orderNumber}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${ORDER_STATUS_COLORS[order.status] || "bg-gray-100 text-gray-700"}`}>
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </span>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-2">Cliente</h2>
            <p className="text-lg font-bold">{order.customerName}</p>
            <a href={`tel:${order.customerPhone}`} className="text-blue-600 font-medium">{order.customerPhone}</a>
          </section>

          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase mb-2">Punto di Consegna</h2>
            <p className="font-semibold">{order.address}</p>
            {order.addressDetail && <p className="text-sm text-gray-500 italic">&quot;{order.addressDetail}&quot;</p>}
            {order.deliveryZone && <p className="text-xs text-gray-400 mt-1 uppercase">Zona: {order.deliveryZone}</p>}
          </section>

          <section className="bg-slate-50 p-4 rounded-xl flex justify-between items-center">
            <div>
              <h2 className="text-xs font-bold text-gray-400 uppercase">Orario Stimato</h2>
              <p className="text-xl font-black">{order.estimatedTime ? formatTime(order.estimatedTime) : order.pickupTime}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xs font-bold text-gray-400 uppercase">Totale</h2>
              <p className="text-xl font-black">{formatCurrency(Number(order.total))}</p>
            </div>
          </section>

          {order.notes && (
            <section className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
               <h2 className="text-xs font-bold text-yellow-600 uppercase mb-1">Note Ordine</h2>
               <p className="text-sm italic">&quot;{order.notes}&quot;</p>
            </section>
          )}
        </div>

        {order.riderId ? (
          <div className="bg-green-50 rounded-2xl p-6 text-center border border-green-200">
            <p className="text-green-700 font-bold">
              {order.rider?.authUserId === user?.id 
                ? "Hai preso in carico questa consegna!" 
                : `Già assegnato a ${order.rider?.name}`}
            </p>
          </div>
        ) : (
          <button
            onClick={handleAssign}
            disabled={assigning}
            className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-100 active:scale-95 transition-all disabled:opacity-50"
          >
            {assigning ? "Elaborazione..." : "Assegnami questa consegna"}
          </button>
        )}

        <button 
          onClick={() => router.back()}
          className="w-full py-3 text-gray-500 font-medium"
        >
          &larr; Indietro
        </button>
      </div>
    </div>
  );
}
