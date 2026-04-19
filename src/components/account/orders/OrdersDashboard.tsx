"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ActiveOrderTracker from "./ActiveOrderTracker";
import OrderHistoryItem from "./OrderHistoryItem";
import OrdersSkeleton from "./OrdersSkeleton";
import type { UserOrder } from "./types";
import { CLOSED_STATUSES } from "./types";

export default function OrdersDashboard() {
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setError("");
      const response = await fetch("/api/user/orders", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Errore durante il recupero ordini");
      }
      const data: UserOrder[] = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore inatteso");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const sortedOrders = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      ),
    [orders]
  );

  const activeOrders = sortedOrders.filter((order) => !CLOSED_STATUSES.includes(order.status));
  const historyOrders = sortedOrders.filter((order) => CLOSED_STATUSES.includes(order.status));
  const activeOrder = activeOrders[0] ?? null;

  if (loading) return <OrdersSkeleton />;

  if (error) {
    return (
      <div className="rounded-[2rem] border border-red-200 bg-red-50 p-5 text-red-700">
        <p className="font-semibold">Impossibile caricare gli ordini</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (sortedOrders.length === 0) {
    return (
      <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm text-center">
        <p className="text-lg font-semibold text-zinc-800">Nessun ordine effettuato finora</p>
        <p className="text-sm text-zinc-500 mt-1">
          Quando effettuerai il primo ordine da loggato, lo vedrai qui con tracking e storico.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      <section>
        <div className="mb-3">
          <h2 className="text-xl md:text-2xl font-semibold text-charcoal">Ordine in Corso</h2>
          <p className="text-sm text-zinc-500">Stato live della tua teglia.</p>
        </div>
        {activeOrder ? (
          <ActiveOrderTracker order={activeOrder} onRefresh={fetchOrders} />
        ) : (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm text-center">
            <p className="text-zinc-700 font-semibold">Nessun ordine attivo al momento</p>
            <p className="text-sm text-zinc-500 mt-1">Tutti i tuoi ordini risultano completati o annullati.</p>
          </div>
        )}
      </section>

      <section>
        <div className="mb-3">
          <h2 className="text-xl md:text-2xl font-semibold text-charcoal">Storico Ordini</h2>
          <p className="text-sm text-zinc-500">I tuoi ordini passati, pronti da riordinare.</p>
        </div>

        {historyOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {historyOrders.map((order) => (
              <OrderHistoryItem key={order.id} order={order} />
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm text-center">
            <p className="text-zinc-700 font-semibold">Storico ancora vuoto</p>
            <p className="text-sm text-zinc-500 mt-1">Appena completi il primo ordine lo vedrai qui.</p>
          </div>
        )}
      </section>
    </div>
  );
}
