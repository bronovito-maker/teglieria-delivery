"use client";

import { useEffect, useState } from "react";

export default function AdminConfigPage() {
  const [maxOrders, setMaxOrders] = useState<number>(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchConfig() {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setMaxOrders(data.maxOrdersPerSlot);
      }
      setLoading(false);
    }
    fetchConfig();
  }, []);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxOrdersPerSlot: maxOrders }),
    });

    if (res.ok) {
      setMessage("Configurazione salvata con successo!");
    } else {
      setMessage("Errore durante il salvataggio.");
    }
    setSaving(false);
  }

  if (loading) return <div className="p-8">Caricamento...</div>;

  return (
    <div className="max-w-4xl animate-in fade-in duration-700">
      <div className="reveal active mb-12">
        <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Parametri Sistema</span>
        <h1 className="text-4xl md:text-5xl font-brand font-medium uppercase tracking-tight text-charcoal">
          Configurazione <span className="text-terracotta">Locale.</span>
        </h1>
        <p className="font-body italic text-charcoal/40 mt-2 tracking-widest uppercase text-[10px]">Ottimizzazione flussi e capacità</p>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
        <div className="p-12">
          <div className="flex flex-col md:flex-row md:items-center gap-12">
            <div className="flex-1">
              <label className="block text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40 mb-4">
                Capienza Max Oraria (Slot 30min)
              </label>
              <p className="font-body italic text-sm text-charcoal/60 mb-8 leading-relaxed">
                Definisci il limite massimo di ordini (Asporto + Delivery) che la cucina può processare ogni mezz&apos;ora per garantire l&apos;eccellenza del servizio.
              </p>
              <div className="flex items-center gap-6">
                <input 
                  type="number" 
                  value={maxOrders} 
                  onChange={(e) => setMaxOrders(parseInt(e.target.value))}
                  className="w-40 px-8 py-6 bg-white border border-charcoal/10 rounded-[2rem] font-brand font-bold text-3xl text-center text-charcoal focus:ring-4 focus:ring-terracotta/5 focus:border-terracotta outline-none transition-all shadow-inner"
                />
                <div className="flex flex-col">
                  <span className="font-brand font-bold uppercase tracking-widest text-[10px] text-charcoal">Ordini</span>
                  <span className="font-body italic text-xs text-charcoal/40">per fascia oraria</span>
                </div>
              </div>
            </div>
            
            <div className="hidden md:block w-px h-40 bg-charcoal/5" />

            <div className="md:w-64 space-y-4">
              <div className="p-6 bg-warm-light/20 rounded-[2rem] border border-charcoal/5">
                <p className="text-[9px] font-brand font-bold uppercase tracking-widest text-charcoal/40 mb-2">Stato Attuale</p>
                <p className="font-brand font-bold text-charcoal text-sm">Limitatore Attivo</p>
              </div>
              <div className="p-6 bg-terracotta/5 rounded-[2rem] border border-terracotta/10">
                <p className="text-[9px] font-brand font-bold uppercase tracking-widest text-terracotta mb-2">Suggerimento</p>
                <p className="font-body italic text-[11px] text-terracotta/80">Mantieni un margine del 10% per le urgenze telefoniche.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-10 border-t border-charcoal/5 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              {message && (
                <p className={`font-brand font-bold uppercase tracking-widest text-[10px] animate-in fade-in slide-in-from-left-2 ${message.includes("successo") ? "text-green-600" : "text-red-500"}`}>
                  {message.includes("successo") ? "✓ " : "⚠ "}{message}
                </p>
              )}
            </div>
            <button 
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto px-12 py-5 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-charcoal/20 hover:bg-terracotta transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? "Ottimizzazione..." : "Salva Configurazione"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
