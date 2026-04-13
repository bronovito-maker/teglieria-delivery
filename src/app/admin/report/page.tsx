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
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Report</h1>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-orange-600">{report.totalOrders}</p>
          <p className="text-sm text-gray-500">Ordini</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{formatCurrency(report.totalRevenue)}</p>
          <p className="text-sm text-gray-500">Incasso</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{report.cancelledOrders}</p>
          <p className="text-sm text-gray-500">Annullati</p>
        </div>
      </div>

      {/* By type */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-3">Per tipologia</h2>
          <table className="w-full text-sm">
            <thead className="text-gray-500">
              <tr><th className="text-left py-1">Tipo</th><th className="text-right">Ordini</th><th className="text-right">Incasso</th></tr>
            </thead>
            <tbody>
              <tr><td>Asporto</td><td className="text-right">{report.byType.asporto.count}</td><td className="text-right">{formatCurrency(report.byType.asporto.revenue)}</td></tr>
              <tr><td>Delivery</td><td className="text-right">{report.byType.delivery.count}</td><td className="text-right">{formatCurrency(report.byType.delivery.revenue)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold mb-3">Per canale</h2>
          <table className="w-full text-sm">
            <thead className="text-gray-500">
              <tr><th className="text-left py-1">Canale</th><th className="text-right">Ordini</th><th className="text-right">Incasso</th></tr>
            </thead>
            <tbody>
              <tr><td>Sito Web</td><td className="text-right">{report.byChannel.web.count}</td><td className="text-right">{formatCurrency(report.byChannel.web.revenue)}</td></tr>
              <tr><td>Telefono</td><td className="text-right">{report.byChannel.phone.count}</td><td className="text-right">{formatCurrency(report.byChannel.phone.revenue)}</td></tr>
              <tr><td>Banco</td><td className="text-right">{report.byChannel.counter.count}</td><td className="text-right">{formatCurrency(report.byChannel.counter.revenue)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Top products */}
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="font-semibold mb-3">Prodotti più venduti</h2>
        <table className="w-full text-sm">
          <thead className="text-gray-500">
            <tr><th className="text-left py-1">Prodotto</th><th className="text-right">Quantità</th><th className="text-right">Incasso</th></tr>
          </thead>
          <tbody>
            {report.topProducts.map((p) => (
              <tr key={p.name}>
                <td className="py-1">{p.name}</td>
                <td className="text-right">{p.quantity}</td>
                <td className="text-right">{formatCurrency(p.revenue)}</td>
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
