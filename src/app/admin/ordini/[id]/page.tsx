"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatTime } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithItems | null>(null);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/ordini/${id}`);
    if (res.ok) setOrder(await res.json());
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function updateStatus(status: string) {
    await fetch(`/api/ordini/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOrder();
  }
  
  async function adjustTime(minutes: number) {
    if (!order) return;
    const baseDate = order.estimatedTime ? new Date(order.estimatedTime) : new Date(order.createdAt);
    const newDate = new Date(baseDate.getTime() + minutes * 60000);
    
    await fetch(`/api/ordini/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estimatedTime: newDate.toISOString() }),
    });
    fetchOrder();
  }

  function handlePrint() {
    const printWindow = window.open(`/api/ordini/${id}/stampa`, "_blank", "width=400,height=600");
    printWindow?.addEventListener("load", () => {
      printWindow.print();
    });
  }

  if (!order) return <p className="text-gray-400">Caricamento...</p>;

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline mb-1">&larr; Indietro</button>
          <h1 className="text-2xl font-bold">Ordine #{order.orderNumber}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm transition-colors">
            Stampa
          </button>
          {nextStatuses.map((status) => (
            <button key={status} onClick={() => updateStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                status === "CANCELLED"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-orange-600 text-white hover:bg-orange-700"
              }`}>
              {ORDER_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4">
        {/* Info */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${ORDER_STATUS_COLORS[order.status]}`}>
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <span className="text-sm text-gray-500">{formatDateTime(order.createdAt)}</span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{order.type === "ASPORTO" ? "Asporto" : "Delivery"}</span>
              <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">{order.channel}</span>
            </div>
            {/* Timing Just Eat Style */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Stima: {order.estimatedTime ? formatTime(order.estimatedTime) : "--:--"}</span>
              <div className="flex border rounded overflow-hidden">
                <button 
                  onClick={() => adjustTime(-15)}
                  className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-xs font-bold border-r">-15'</button>
                <button 
                  onClick={() => adjustTime(15)}
                  className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-xs font-bold border-r">+15'</button>
                <button 
                  onClick={() => adjustTime(30)}
                  className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-xs font-bold">+30'</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Cliente</p>
              <p className="font-medium">{order.customerName}</p>
              <p>{order.customerPhone}</p>
              <p className="mt-1 font-semibold text-blue-600">Richiesto: {order.timeSlot || (order.pickupTime ? new Date(order.pickupTime).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'N/D')}</p>
            </div>
            {order.type === "DELIVERY" && (
              <div>
                <p className="text-gray-500">Consegna</p>
                <p className="font-medium">{order.address}</p>
                {order.addressDetail && <p>{order.addressDetail}</p>}
                {order.deliveryZone && <p className="text-gray-500">Zona: {order.deliveryZone}</p>}
              </div>
            )}
            <div className="mt-2 pt-2 border-t col-span-2 flex items-center gap-2">
              <p className="text-gray-500 italic">Pagamento:</p>
              <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                order.paymentMethod === "POS" 
                  ? "bg-blue-600 text-white" 
                  : "bg-green-600 text-white"
              }`}>
                {order.paymentMethod === "POS" ? "💳 POS / CARTA" : "💵 CONTANTI"}
              </span>
            </div>
          </div>

          {order.notes && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-sm">
              <span className="font-medium">Note:</span> {order.notes}
            </div>
          )}
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold mb-3">Prodotti</h2>
          <div className="space-y-2 text-sm">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <div>
                  <span className="font-medium">{item.quantity}x {item.productName}</span>
                  {item.variant && <span className="text-gray-500"> ({item.variant})</span>}
                  {item.additions && (
                    <p className="text-xs text-gray-500">
                      + {(item.additions as any[]).map((a: any) => a.name).join(", ")}
                    </p>
                  )}
                  {item.removals && (
                    <p className="text-xs text-gray-500">
                      - {(item.removals as any[]).map((r: any) => r.name).join(", ")}
                    </p>
                  )}
                  {item.notes && <p className="text-xs text-gray-400 italic">{item.notes}</p>}
                </div>
                <span>{formatCurrency(Number(item.totalPrice))}</span>
              </div>
            ))}
            <div className="border-t pt-2 space-y-1">
              <div className="flex justify-between">
                <span>Subtotale</span>
                <span>{formatCurrency(Number(order.subtotal))}</span>
              </div>
              {order.deliveryCost && Number(order.deliveryCost) > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Consegna</span>
                  <span>{formatCurrency(Number(order.deliveryCost))}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg">
                <span>Totale</span>
                <span>{formatCurrency(Number(order.total))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status history */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="font-semibold mb-3">Cronologia</h2>
          <div className="space-y-2">
            {order.statusHistory.map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-12">{formatTime(log.createdAt)}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${ORDER_STATUS_COLORS[log.status]}`}>
                  {ORDER_STATUS_LABELS[log.status]}
                </span>
                {log.note && <span className="text-gray-500">{log.note}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
