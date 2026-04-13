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
    <div className="max-w-6xl">
      <div className="mb-6 md:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-1">
            Operatività
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">Ordini</h1>
        </div>
        <Link href="/admin/ordini/nuovo"
          className="px-4 py-2 tomato-glass border text-white rounded-xl font-semibold hover:brightness-105 transition-all">
          + Nuovo ordine
        </Link>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
          className="px-3 py-2.5 border border-red-100 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#cf2a1d]/30 outline-none" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 border border-red-100 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#cf2a1d]/30 outline-none">
          <option value="">Tutti gli stati</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2.5 border border-red-100 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#cf2a1d]/30 outline-none">
          <option value="">Tutti i tipi</option>
          <option value="ASPORTO">Asporto</option>
          <option value="DELIVERY">Delivery</option>
        </select>
      </div>

      <div className="hidden md:block bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_22px_rgba(31,38,135,0.05)] overflow-hidden">
        <table className="w-full text-sm md:text-base">
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

      <div className="md:hidden space-y-3">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/ordini/${o.id}`}
            className="block rounded-2xl border border-red-100/80 bg-white/90 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-[#1d1d1f]">#{o.orderNumber}</p>
                <p className="text-sm text-gray-500">{formatTime(o.createdAt)} • {ORDER_CHANNEL_LABELS[o.channel]}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ORDER_STATUS_COLORS[o.status]}`}>
                {ORDER_STATUS_LABELS[o.status]}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-[0.08em]">Cliente</p>
                <p className="font-medium text-[#1d1d1f]">{o.customerName}</p>
              </div>
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-[0.08em]">Tipo</p>
                <p className="font-medium text-[#1d1d1f]">{ORDER_TYPE_LABELS[o.type]}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-red-100/70 flex items-center justify-between">
              <span className="text-sm text-[#cf2a1d] font-semibold">Dettagli</span>
              <span className="text-base font-bold text-[#1d1d1f]">{formatCurrency(Number(o.total))}</span>
            </div>
          </Link>
        ))}
        {orders.length === 0 && (
          <p className="px-4 py-8 text-gray-400 text-center">Nessun ordine trovato.</p>
        )}
      </div>
    </div>
  );
}
