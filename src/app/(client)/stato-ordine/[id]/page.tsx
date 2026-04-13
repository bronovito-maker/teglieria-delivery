"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

const STATUS_STEPS = ["RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT", "DELIVERED"];

export default function StatoOrdinePage() {
  const { id } = useParams();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetchOrder() {
      try {
        const res = await fetch(`/api/ordini/${id}`);
        if (!res.ok) { setError(true); return; }
        const data = await res.json();
        setOrder(data);

        // Stop polling on terminal states
        if (data.status === "DELIVERED" || data.status === "CANCELLED") {
          clearInterval(interval);
        }
      } catch {
        setError(true);
      }
    }

    fetchOrder();
    interval = setInterval(fetchOrder, 10000);
    return () => clearInterval(interval);
  }, [id]);

  if (error) return <p className="text-center py-12 text-red-500">Ordine non trovato.</p>;
  if (!order) return <p className="text-center py-12 text-gray-400">Caricamento...</p>;

  const currentStepIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2">Stato ordine</h1>
      <p className="text-sm text-gray-500 mb-6">Ordine #{order.orderNumber}</p>

      {order.status === "CANCELLED" ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-6">
          <p className="text-red-700 font-semibold text-lg">Ordine annullato</p>
          <p className="text-sm text-red-500 mt-1">Contatta il locale per maggiori informazioni.</p>
        </div>
      ) : (
        <>
          {/* Progress bar */}
          <div className="bg-white rounded-xl shadow p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {STATUS_STEPS.map((step, i) => (
                <div key={step} className="flex-1">
                  <div className={`h-2 rounded-full ${i <= currentStepIndex ? "bg-orange-500" : "bg-gray-200"}`} />
                  <p className={`text-[10px] mt-1 text-center ${i <= currentStepIndex ? "text-orange-600 font-medium" : "text-gray-400"}`}>
                    {ORDER_STATUS_LABELS[step]}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {order.status === "RECEIVED" && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-700">
              Il tuo ordine è stato ricevuto ed è in attesa di conferma.
            </div>
          )}
        </>
      )}

      {/* Dettagli ordine */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        <h2 className="font-semibold">Dettagli</h2>
        <div className="text-sm space-y-1">
          <p><span className="text-gray-500">Tipo:</span> {order.type === "ASPORTO" ? "Asporto" : "Delivery"}</p>
          <p><span className="text-gray-500">Nome:</span> {order.customerName}</p>
          {order.address && <p><span className="text-gray-500">Indirizzo:</span> {order.address}</p>}
        </div>

        <div className="border-t pt-3 space-y-1 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>
                {item.quantity}x {item.productName}
                {item.variant && ` (${item.variant})`}
              </span>
              <span>{formatCurrency(Number(item.totalPrice))}</span>
            </div>
          ))}
          <div className="border-t pt-2 flex justify-between font-bold">
            <span>Totale</span>
            <span>{formatCurrency(Number(order.total))}</span>
          </div>
        </div>

        {/* Status history */}
        <div className="border-t pt-3">
          <p className="text-xs text-gray-500 font-medium mb-2">Cronologia</p>
          {order.statusHistory.map((log) => (
            <div key={log.id} className="flex items-center gap-2 text-xs text-gray-500">
              <span>{formatTime(log.createdAt)}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${ORDER_STATUS_COLORS[log.status]}`}>
                {ORDER_STATUS_LABELS[log.status]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
