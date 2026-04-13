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
    <div className="p-8 max-w-2xl bg-white rounded-2xl shadow-sm border mt-10 mx-auto">
      <h1 className="text-2xl font-bold mb-6">Impostazioni Logistica</h1>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Capienza Massima Oraria (ogni 30 minuti)
          </label>
          <p className="text-sm text-gray-400 mb-4">
            Numero massimo di ordini (Asporto + Delivery) che il locale può gestire contemporaneamente in una fascia oraria.
          </p>
          <div className="flex items-center gap-4">
            <input 
              type="number" 
              value={maxOrders} 
              onChange={(e) => setMaxOrders(parseInt(e.target.value))}
              className="w-32 p-3 border rounded-xl focus:ring-2 focus:ring-orange-500 outline-none text-xl font-bold text-center"
            />
            <span className="text-gray-500 font-medium">ordini / 30 min</span>
          </div>
        </div>

        <div className="pt-6 border-t flex items-center justify-between">
          <p className={`text-sm ${message.includes("successo") ? "text-green-600" : "text-red-600"}`}>
            {message}
          </p>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Salvataggio..." : "Salva Configurazione"}
          </button>
        </div>
      </div>
    </div>
  );
}
