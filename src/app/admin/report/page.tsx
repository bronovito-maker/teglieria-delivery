"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Report = {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  cancelledOrders: number;
  byType: {
    asporto: { count: number; revenue: number };
    delivery: { count: number; revenue: number };
  };
  byChannel: {
    web: { count: number; revenue: number };
    phone: { count: number; revenue: number };
    counter: { count: number; revenue: number };
  };
  topProducts: { name: string; quantity: number; revenue: number }[];
};

export default function ReportPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch(`/api/report?date=${date}`).then((r) => r.json()).then(setReport);
  }, [date]);

  if (!report) return <p className="text-gray-400">Caricamento...</p>;

  return (
    <div className="max-w-6xl">
      <div className="mb-6 md:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] md:text-xs font-bold uppercase tracking-[0.22em] text-[#cf2a1d]/80 mb-1">
            Analytics
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#1d1d1f]">Report</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-auto px-4 py-2.5 border border-red-100 rounded-xl text-sm bg-white focus:ring-2 focus:ring-[#cf2a1d]/30 outline-none"
        />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 text-center">
          <p className="text-3xl font-bold text-[#cf2a1d]">{report.totalOrders}</p>
          <p className="text-sm text-gray-500">Ordini</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(report.totalRevenue)}</p>
          <p className="text-sm text-gray-500">Incasso</p>
        </div>
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 text-center md:col-start-auto">
          <p className="text-3xl font-bold text-red-400">{report.cancelledOrders}</p>
          <p className="text-sm text-gray-500">Annullati</p>
        </div>
      </div>

      {/* By type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 md:p-5">
          <h2 className="font-semibold mb-3">Per tipologia</h2>
          <table className="w-full text-sm md:text-base">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left py-1">Tipo</th>
                <th className="text-right">Ordini</th>
                <th className="text-right">Incasso</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5">Asporto</td>
                <td className="text-right tabular-nums">{report.byType.asporto.count}</td>
                <td className="text-right tabular-nums">{formatCurrency(report.byType.asporto.revenue)}</td>
              </tr>
              <tr>
                <td className="py-1.5">Delivery</td>
                <td className="text-right tabular-nums">{report.byType.delivery.count}</td>
                <td className="text-right tabular-nums">{formatCurrency(report.byType.delivery.revenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 md:p-5">
          <h2 className="font-semibold mb-3">Per canale</h2>
          <table className="w-full text-sm md:text-base">
            <thead className="text-gray-500">
              <tr>
                <th className="text-left py-1">Canale</th>
                <th className="text-right">Ordini</th>
                <th className="text-right">Incasso</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="py-1.5">Sito Web</td>
                <td className="text-right tabular-nums">{report.byChannel.web.count}</td>
                <td className="text-right tabular-nums">{formatCurrency(report.byChannel.web.revenue)}</td>
              </tr>
              <tr>
                <td className="py-1.5">Telefono</td>
                <td className="text-right tabular-nums">{report.byChannel.phone.count}</td>
                <td className="text-right tabular-nums">{formatCurrency(report.byChannel.phone.revenue)}</td>
              </tr>
              <tr>
                <td className="py-1.5">Banco</td>
                <td className="text-right tabular-nums">{report.byChannel.counter.count}</td>
                <td className="text-right tabular-nums">{formatCurrency(report.byChannel.counter.revenue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white/90 rounded-2xl border border-red-100/80 shadow-[0_10px_22px_rgba(31,38,135,0.05)] p-4 md:p-5">
        <h2 className="font-semibold mb-3">Prodotti più venduti</h2>
        <div className="md:hidden space-y-2">
          {report.topProducts.map((p) => (
            <div key={p.name} className="rounded-xl border border-red-100/70 bg-red-50/30 p-3">
              <p className="font-medium text-[#1d1d1f]">{p.name}</p>
              <div className="mt-1 flex items-center justify-between text-sm text-gray-600">
                <span>Q.tà: <span className="tabular-nums font-semibold">{p.quantity}</span></span>
                <span className="tabular-nums font-semibold">{formatCurrency(p.revenue)}</span>
              </div>
            </div>
          ))}
          {report.topProducts.length === 0 && (
            <p className="text-center text-gray-400 py-4">Nessun dato</p>
          )}
        </div>

        <table className="hidden md:table w-full text-sm md:text-base">
          <thead className="text-gray-500">
            <tr>
              <th className="text-left py-1">Prodotto</th>
              <th className="text-right">Quantità</th>
              <th className="text-right">Incasso</th>
            </tr>
          </thead>
          <tbody>
            {report.topProducts.map((p) => (
              <tr key={p.name}>
                <td className="py-1.5">{p.name}</td>
                <td className="text-right tabular-nums">{p.quantity}</td>
                <td className="text-right tabular-nums">{formatCurrency(p.revenue)}</td>
              </tr>
            ))}
            {report.topProducts.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 py-4">Nessun dato</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
