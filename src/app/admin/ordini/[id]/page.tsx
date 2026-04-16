"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_STATUS_TRANSITIONS } from "@/lib/constants";
import { formatCurrency, formatDateTime, formatTime, formatOrderCode } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

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

  function openDeleteModal() {
    setDeletePassword("");
    setDeleteError("");
    setShowDeleteModal(true);
  }

  async function handleDeleteOrder() {
    if (!order) return;
    setDeleteError("");
    setDeleting(true);

    const res = await fetch(`/api/ordini/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminPassword: deletePassword }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Errore durante l'eliminazione ordine" }));
      setDeleteError(data.error || "Errore durante l'eliminazione ordine");
      setDeleting(false);
      return;
    }

    setShowDeleteModal(false);
    router.push("/admin/ordini");
    router.refresh();
  }

  if (!order) return <p className="text-gray-400">Caricamento...</p>;

  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status] || [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:underline mb-1">&larr; Indietro</button>
          <h1 className="text-2xl font-bold">Ordine #{formatOrderCode(order)}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm transition-colors">
            Stampa
          </button>
          <button
            onClick={openDeleteModal}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            Elimina ordine
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
                  className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-xs font-bold border-r">-15&apos;</button>
                <button 
                  onClick={() => adjustTime(15)}
                  className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-xs font-bold border-r">+15&apos;</button>
                <button 
                  onClick={() => adjustTime(30)}
                  className="px-2 py-1 bg-gray-50 hover:bg-gray-100 text-xs font-bold">+30&apos;</button>
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
                {order.rider ? (
                  <p className="mt-1 text-sm font-medium text-orange-600">🛵 {order.rider.name}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-400 italic">Nessun fattorino assegnato</p>
                )}
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

      {showDeleteModal && (
        <div className="fixed inset-0 z-[90] bg-black/45 flex items-end sm:items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-lg rounded-3xl border border-red-100/80 bg-white shadow-[0_20px_45px_rgba(31,38,135,0.12)]">
            <div className="px-5 py-4 border-b border-red-100/80 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#cf2a1d]/80 font-bold">Eliminazione ordine</p>
                <h3 className="text-xl font-bold text-[#1d1d1f]">Ordine #{formatOrderCode(order)}</h3>
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="h-9 w-9 rounded-xl border border-red-100 text-gray-500 hover:bg-red-50/60 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Stai per eliminare definitivamente questo ordine.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password amministratore
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-red-100 rounded-xl focus:ring-2 focus:ring-[#cf2a1d] focus:border-[#cf2a1d] outline-none"
                  placeholder="Inserisci password eliminazione"
                />
                <p className="mt-2 text-xs text-gray-500">
                  La password è sempre obbligatoria per eliminare un ordine.
                </p>
              </div>

              {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}
            </div>

            <div className="p-5 border-t border-red-100/80 flex flex-col sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl border border-red-100 bg-white text-[#cf2a1d] font-semibold hover:bg-red-50/60 transition-colors"
              >
                Annulla
              </button>
              <button
                type="button"
                onClick={handleDeleteOrder}
                disabled={deleting || !deletePassword.trim()}
                className="px-4 py-2.5 rounded-xl bg-red-600 border border-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Eliminazione..." : "Conferma eliminazione"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
