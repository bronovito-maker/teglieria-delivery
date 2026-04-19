"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, ORDER_TYPE_LABELS, ORDER_CHANNEL_LABELS } from "@/lib/constants";
import { formatCurrency, formatTime, formatOrderCode } from "@/lib/utils";
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
    <div className="max-w-7xl animate-in fade-in duration-700">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="reveal active">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Operatività</span>
          <h1 className="text-5xl md:text-6xl font-display tracking-tight text-charcoal">
            Registro <span className="text-terracotta">Ordini.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-2 tracking-widest uppercase text-[10px]">Gestione storica e flussi</p>
        </div>
        <Link href="/admin/ordini/nuovo"
          className="w-fit px-8 py-4 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-charcoal/20 hover:bg-terracotta transition-all active:scale-95">
          + Nuovo Ordine Manuale
        </Link>
      </div>

      {/* Filters Overlay */}
      <div className="bg-white/50 backdrop-blur-xl rounded-[2.5rem] p-6 mb-10 border border-charcoal/5 shadow-sm reveal active">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 ml-4">Data</label>
            <input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-6 py-3 bg-white border border-charcoal/5 rounded-full font-body italic text-xs focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all shadow-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 ml-4">Stato Ordine</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-6 py-3 bg-white border border-charcoal/5 rounded-full font-body italic text-xs focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all shadow-sm appearance-none cursor-pointer">
              <option value="">Tutti gli stati</option>
              {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 ml-4">Canale Distribuzione</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-6 py-3 bg-white border border-charcoal/5 rounded-full font-body italic text-xs focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all shadow-sm appearance-none cursor-pointer">
              <option value="">Tutti i flussi</option>
              <option value="ASPORTO">Solo Asporto</option>
              <option value="DELIVERY">Solo Delivery</option>
            </select>
          </div>
        </div>
      </div>

      <div className="hidden md:block bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-x-auto reveal active">
        <table className="w-full border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-charcoal/5">
              <th className="px-4 lg:px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Id</th>
              <th className="px-4 lg:px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Ora</th>
              <th className="px-4 lg:px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Cliente</th>
              <th className="px-4 lg:px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Canale</th>
              <th className="px-4 lg:px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Valore</th>
              <th className="px-4 lg:px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40 text-center">Status</th>
              <th className="px-4 lg:px-8 py-6"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {orders.map((o) => (
              <tr key={o.id} className="group hover:bg-warm-light/50 transition-colors">
                <td className="px-4 lg:px-8 py-5 font-brand font-bold text-lg text-charcoal">#{formatOrderCode(o)}</td>
                <td className="px-4 lg:px-8 py-5 font-body italic text-xs text-charcoal/40 group-hover:text-charcoal transition-colors whitespace-nowrap">{formatTime(o.createdAt)}</td>
                <td className="px-4 lg:px-8 py-5 font-brand font-bold uppercase tracking-widest text-[11px] text-charcoal">{o.customerName}</td>
                <td className="px-4 lg:px-8 py-5">
                   <span className="font-body italic text-xs text-charcoal/60">{ORDER_TYPE_LABELS[o.type]}</span>
                   <p className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/20 mt-0.5">{ORDER_CHANNEL_LABELS[o.channel]}</p>
                </td>
                <td className="px-4 lg:px-8 py-5 font-brand font-bold text-charcoal whitespace-nowrap">{formatCurrency(Number(o.total))}</td>
                <td className="px-4 lg:px-8 py-5 text-center">
                  <span className={`inline-block px-3 py-1.5 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest border shadow-sm transition-all duration-500 ${
                    ORDER_STATUS_COLORS[o.status] || "bg-charcoal/5 text-charcoal/40 border-charcoal/10"
                  }`}>
                    {ORDER_STATUS_LABELS[o.status] || o.status}
                  </span>
                </td>
                <td className="px-4 lg:px-8 py-5 text-right">
                  <Link href={`/admin/ordini/${o.id}`}
                    className="inline-flex items-center gap-2 font-brand font-bold uppercase tracking-widest text-[9px] text-terracotta hover:text-charcoal transition-colors px-4 py-2 bg-terracotta/5 rounded-full group-hover:bg-white group-hover:shadow-sm whitespace-nowrap">
                    Dettagli
                    <span>→</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20 text-xs text-center">Nessun ordine presente per questa selezione.</p>
          </div>
        )}
      </div>

      {/* Mobile Card Layout */}
      <div className="md:hidden space-y-4">
        {orders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/ordini/${o.id}`}
            className="block rounded-[2.5rem] border border-charcoal/5 bg-white p-8 shadow-sm active:scale-[0.98] transition-transform"
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-3xl font-brand font-bold tracking-tighter text-charcoal">#{formatOrderCode(o)}</p>
                <p className="font-body italic text-xs text-charcoal/40 mt-1">{formatTime(o.createdAt)} • {ORDER_CHANNEL_LABELS[o.channel]}</p>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest border shadow-sm transition-all duration-500 ${
                    ORDER_STATUS_COLORS[o.status] || "bg-charcoal/5 text-charcoal/40 border-charcoal/10"
                  }`}>
                {ORDER_STATUS_LABELS[o.status]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 mb-1">Cliente</p>
                <p className="font-brand font-bold uppercase tracking-widest text-[11px] text-charcoal truncate">{o.customerName}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/30 mb-1">Tipo</p>
                <p className="font-brand font-bold uppercase tracking-widest text-[11px] text-charcoal">{ORDER_TYPE_LABELS[o.type]}</p>
              </div>
            </div>

            <div className="pt-6 border-t border-charcoal/5 flex items-center justify-between">
              <span className="font-brand font-bold uppercase tracking-widest text-[10px] text-terracotta">Apri Dettaglio</span>
              <span className="text-xl font-brand font-bold text-charcoal">{formatCurrency(Number(o.total))}</span>
            </div>
          </Link>
        ))}
        {orders.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20 text-xs">Nessun ordine trovato.</p>
          </div>
        )}
      </div>
    </div>
  );
}
