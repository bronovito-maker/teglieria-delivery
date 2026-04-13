"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS, ORDER_CHANNEL_LABELS } from "@/lib/constants";
import { formatCurrency, formatTime } from "@/lib/utils";
import type { OrderWithItems } from "@/types";

export default function OrdiniPage() {
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    fetch(`/api/ordini?${params}`).then((r) => r.json()).then(setOrders);
  }, [dateFilter, statusFilter, typeFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Ordini</h1>
        <Link href="/admin/ordini/nuovo"
          className="px-4 py-2 tomato-glass border text-white rounded-xl font-semibold hover:brightness-105 transition-all">
          + Nuovo ordine
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Tutti gli stati</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Tutti i tipi</option>
          <option value="ASPORTO">Asporto</option>
          <option value="DELIVERY">Delivery</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Ora</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3">Canale</th>
              <th className="px-4 py-3">Totale</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-bold">{o.orderNumber}</td>
                <td className="px-4 py-3 text-gray-500">{formatTime(o.createdAt)}</td>
                <td className="px-4 py-3">{o.customerName}</td>
                <td className="px-4 py-3">{ORDER_TYPE_LABELS[o.type]}</td>
                <td className="px-4 py-3 text-gray-500">{ORDER_CHANNEL_LABELS[o.channel]}</td>
                <td className="px-4 py-3 font-medium">{formatCurrency(Number(o.total))}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/ordini/${o.id}`} className="text-blue-600 hover:underline text-sm">
                    Dettagli
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="px-4 py-8 text-gray-400 text-center">Nessun ordine trovato.</p>
        )}
      </div>
    </div>
  );
}
