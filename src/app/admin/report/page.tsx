"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

type Report = {
  date: string;
  totalOrders: number;
  totalRevenue: number;
  cancelledOrders: number;
  financial: {
    riderCompensation: number;
    netAfterRiderCompensation: number;
    deliveryCompletedCount: number;
  };
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
    <div className="max-w-7xl animate-in fade-in duration-700">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-12">
        <div className="reveal active">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Performance Store</span>
          <h1 className="text-5xl md:text-6xl font-display tracking-tight text-charcoal">
            Analitica <span className="text-terracotta">Report.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-2 tracking-widest uppercase text-[10px]">Bilancio giornaliero e flussi</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full sm:w-auto px-8 py-4 bg-white border border-charcoal/5 rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-sm hover:bg-warm-light transition-all outline-none focus:ring-2 focus:ring-terracotta/20"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-12">
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-charcoal/5 p-8 shadow-sm reveal active text-center">
          <p className="text-4xl font-brand font-bold text-charcoal mb-2">{report.totalOrders}</p>
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30">Volume Ordini</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-charcoal/5 p-8 shadow-sm reveal active text-center">
          <p className="text-4xl font-brand font-bold text-terracotta mb-2">{formatCurrency(report.totalRevenue)}</p>
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30">Incasso Lordo</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-charcoal/5 p-8 shadow-sm reveal active text-center">
          <p className="text-4xl font-brand font-bold text-marigold mb-2">{report.cancelledOrders}</p>
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30">Annullati</p>
        </div>
        <div className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-charcoal/5 p-8 shadow-sm reveal active text-center">
          <p className="text-3xl font-brand font-bold text-charcoal mb-2">{formatCurrency(report.financial.riderCompensation)}</p>
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-charcoal/30">Costo Consegna</p>
        </div>
        <div className="col-span-2 md:col-span-1 bg-charcoal text-white rounded-[2.5rem] p-8 shadow-2xl reveal active text-center">
          <p className="text-3xl font-brand font-bold mb-2">{formatCurrency(report.financial.netAfterRiderCompensation)}</p>
          <p className="text-[9px] uppercase tracking-[0.2em] font-brand font-bold text-white/40">Netto Store</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
          <div className="px-10 py-6 border-b border-charcoal/5 bg-warm-light/20">
            <h2 className="font-brand font-bold uppercase tracking-[0.2em] text-[10px] text-charcoal">Flusso per Tipologia</h2>
          </div>
          <div className="p-10">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-charcoal/5">
                  <th className="pb-4 text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Tipo Servizio</th>
                  <th className="pb-4 text-right text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Qtà</th>
                  <th className="pb-4 text-right text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Rendimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                <tr className="group">
                  <td className="py-5 font-brand font-bold text-charcoal">Asporto</td>
                  <td className="py-5 text-right font-brand font-bold text-charcoal/60">{report.byType.asporto.count}</td>
                  <td className="py-5 text-right font-brand font-bold text-terracotta">{formatCurrency(report.byType.asporto.revenue)}</td>
                </tr>
                <tr className="group">
                  <td className="py-5 font-brand font-bold text-charcoal">Delivery</td>
                  <td className="py-5 text-right font-brand font-bold text-charcoal/60">{report.byType.delivery.count}</td>
                  <td className="py-5 text-right font-brand font-bold text-terracotta">{formatCurrency(report.byType.delivery.revenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
           <div className="px-10 py-6 border-b border-charcoal/5 bg-warm-light/20">
            <h2 className="font-brand font-bold uppercase tracking-[0.2em] text-[10px] text-charcoal">Saturazione Canali</h2>
          </div>
          <div className="p-10">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-charcoal/5">
                  <th className="pb-4 text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Sorgente</th>
                  <th className="pb-4 text-right text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Qtà</th>
                  <th className="pb-4 text-right text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Rendimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/5">
                <tr>
                  <td className="py-5 font-brand font-bold text-charcoal">Web Store</td>
                  <td className="py-5 text-right font-brand font-bold text-charcoal/60">{report.byChannel.web.count}</td>
                  <td className="py-5 text-right font-brand font-bold text-terracotta">{formatCurrency(report.byChannel.web.revenue)}</td>
                </tr>
                <tr>
                  <td className="py-5 font-brand font-bold text-charcoal">Ordine Telefonico</td>
                  <td className="py-5 text-right font-brand font-bold text-charcoal/60">{report.byChannel.phone.count}</td>
                  <td className="py-5 text-right font-brand font-bold text-terracotta">{formatCurrency(report.byChannel.phone.revenue)}</td>
                </tr>
                <tr>
                  <td className="py-5 font-brand font-bold text-charcoal">Vendita al Banco</td>
                  <td className="py-5 text-right font-brand font-bold text-charcoal/60">{report.byChannel.counter.count}</td>
                  <td className="py-5 text-right font-brand font-bold text-terracotta">{formatCurrency(report.byChannel.counter.revenue)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active mb-20">
         <div className="px-10 py-6 border-b border-charcoal/5 bg-warm-light/20">
            <h2 className="font-brand font-bold uppercase tracking-[0.2em] text-[10px] text-charcoal">Preferenze Prodotti</h2>
          </div>
        <div className="p-10">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-charcoal/5">
                <th className="pb-4 text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Referenza</th>
                <th className="pb-4 text-right text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Volumi</th>
                <th className="pb-4 text-right text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40">Fatturato</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {report.topProducts.map((p) => (
                <tr key={p.name} className="group hover:bg-warm-light/30 transition-colors">
                  <td className="py-5 font-brand font-bold text-charcoal">{p.name}</td>
                  <td className="py-5 text-right font-brand font-bold text-charcoal/60">{p.quantity}</td>
                  <td className="py-5 text-right font-brand font-bold text-terracotta">{formatCurrency(p.revenue)}</td>
                </tr>
              ))}
              {report.topProducts.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-20 text-center font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20 text-xs">
                    Nessun dato di vendita registrato.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
