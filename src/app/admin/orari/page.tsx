"use client";

import { useEffect, useState } from "react";

const DAY_NAMES = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
const DAY_SHORT = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];
// Italian week order: Mon first
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

type DayConfig = {
  dayOfWeek: number;
  isOpen: boolean;
  lunchActive: boolean;
  lunchStart: string;
  lunchEnd: string;
  dinnerActive: boolean;
  dinnerStart: string;
  dinnerEnd: string;
};

type ClosedDate = {
  id: number;
  date: string;
  reason: string | null;
};

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${on ? "bg-terracotta" : "bg-charcoal/15"}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

function TimeRange({
  start,
  end,
  onStart,
  onEnd,
}: {
  start: string;
  end: string;
  onStart: (v: string) => void;
  onEnd: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mt-2">
      <input
        type="time"
        value={start}
        onChange={(e) => onStart(e.target.value)}
        className="flex-1 px-3 py-2 bg-charcoal/5 rounded-xl text-xs font-brand font-bold text-charcoal focus:ring-2 focus:ring-terracotta/20 outline-none border border-charcoal/10"
      />
      <span className="text-charcoal/30 text-xs font-brand">—</span>
      <input
        type="time"
        value={end}
        onChange={(e) => onEnd(e.target.value)}
        className="flex-1 px-3 py-2 bg-charcoal/5 rounded-xl text-xs font-brand font-bold text-charcoal focus:ring-2 focus:ring-terracotta/20 outline-none border border-charcoal/10"
      />
    </div>
  );
}

export default function AdminOrariPage() {
  const [schedule, setSchedule] = useState<DayConfig[]>([]);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [newDate, setNewDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const [s, c] = await Promise.all([
        fetch("/api/admin/orari").then((r) => r.json()),
        fetch("/api/admin/chiusure").then((r) => r.json()),
      ]);
      setSchedule(s);
      setClosedDates(c);
      setLoading(false);
    }
    load();
  }, []);

  function updateDay(dayOfWeek: number, patch: Partial<DayConfig>) {
    setSchedule((prev) =>
      prev.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d))
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/orari", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    });
    setMessage(res.ok ? "Orari salvati!" : "Errore durante il salvataggio.");
    setSaving(false);
    setTimeout(() => setMessage(""), 3000);
  }

  async function handleAddClosure() {
    if (!newDate) return;
    const res = await fetch("/api/admin/chiusure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate, reason: newReason }),
    });
    if (res.ok) {
      const record = await res.json();
      setClosedDates((prev) => [...prev.filter((c) => c.date !== newDate), record].sort((a, b) => a.date.localeCompare(b.date)));
      setNewDate("");
      setNewReason("");
    }
  }

  async function handleDeleteClosure(date: string) {
    await fetch(`/api/admin/chiusure?date=${date}`, { method: "DELETE" });
    setClosedDates((prev) => prev.filter((c) => c.date !== date));
  }

  if (loading) return <div className="p-8 text-charcoal/40 font-brand uppercase tracking-widest text-xs">Caricamento...</div>;

  const scheduleMap = Object.fromEntries(schedule.map((d) => [d.dayOfWeek, d]));

  return (
    <div className="max-w-5xl animate-in fade-in duration-700">
      {/* Header */}
      <div className="mb-10">
        <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Configurazione</span>
        <h1 className="text-5xl md:text-6xl font-display tracking-tight text-charcoal">
          Orari <span className="text-terracotta">Apertura.</span>
        </h1>
        <p className="font-body italic text-charcoal/40 mt-2 tracking-widest uppercase text-[10px]">Gestisci pranzo, cena e chiusure straordinarie</p>
      </div>

      {/* Weekly Schedule */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
        {WEEK_ORDER.map((dow) => {
          const day = scheduleMap[dow];
          if (!day) return null;
          return (
            <div
              key={dow}
              className={`rounded-[2rem] border transition-all overflow-hidden ${
                day.isOpen
                  ? "bg-white/80 border-terracotta/20 shadow-lg shadow-terracotta/5"
                  : "bg-white/40 border-charcoal/5"
              }`}
            >
              {/* Day header */}
              <div className={`px-5 py-4 flex items-center justify-between ${day.isOpen ? "bg-terracotta/5" : ""}`}>
                <div>
                  <p className="font-brand font-bold uppercase tracking-widest text-[10px] text-charcoal/40">{DAY_SHORT[dow]}</p>
                  <p className="font-brand font-medium uppercase tracking-tight text-charcoal text-sm leading-tight">{DAY_NAMES[dow]}</p>
                </div>
                <Toggle on={day.isOpen} onChange={(v) => updateDay(dow, { isOpen: v })} />
              </div>

              {/* Services */}
              {day.isOpen ? (
                <div className="px-5 pb-5 space-y-4 pt-3">
                  {/* Pranzo */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/50">Pranzo</span>
                      <Toggle on={day.lunchActive} onChange={(v) => updateDay(dow, { lunchActive: v })} />
                    </div>
                    {day.lunchActive && (
                      <TimeRange
                        start={day.lunchStart}
                        end={day.lunchEnd}
                        onStart={(v) => updateDay(dow, { lunchStart: v })}
                        onEnd={(v) => updateDay(dow, { lunchEnd: v })}
                      />
                    )}
                  </div>

                  <div className="h-px bg-charcoal/5" />

                  {/* Cena */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-brand font-bold uppercase tracking-widest text-charcoal/50">Cena</span>
                      <Toggle on={day.dinnerActive} onChange={(v) => updateDay(dow, { dinnerActive: v })} />
                    </div>
                    {day.dinnerActive && (
                      <TimeRange
                        start={day.dinnerStart}
                        end={day.dinnerEnd}
                        onStart={(v) => updateDay(dow, { dinnerStart: v })}
                        onEnd={(v) => updateDay(dow, { dinnerEnd: v })}
                      />
                    )}
                  </div>

                  {!day.lunchActive && !day.dinnerActive && (
                    <p className="text-[10px] font-body italic text-charcoal/30 text-center pt-1">Nessun servizio attivo</p>
                  )}
                </div>
              ) : (
                <div className="px-5 pb-5 pt-2">
                  <p className="text-[10px] font-body italic text-charcoal/25 text-center">Chiuso</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-4 mb-14 flex-wrap">
        {message && (
          <p className={`font-brand font-bold uppercase tracking-widest text-[10px] animate-in fade-in ${message.includes("salvati") ? "text-green-600" : "text-red-500"}`}>
            {message.includes("salvati") ? "✓ " : "⚠ "}{message}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="ml-auto px-10 py-4 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-charcoal/20 hover:bg-terracotta transition-all active:scale-95 disabled:opacity-50"
        >
          {saving ? "Salvataggio..." : "Salva Orari"}
        </button>
      </div>

      {/* Chiusure Straordinarie */}
      <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-charcoal/5">
          <h2 className="font-brand font-bold uppercase tracking-widest text-xs text-charcoal/40 mb-1">Chiusure Straordinarie</h2>
          <p className="font-body italic text-[11px] text-charcoal/30">Festività, ferie o eventi speciali che sovrascrivono il calendario settimanale.</p>
        </div>

        {/* Add new closure */}
        <div className="p-8 border-b border-charcoal/5">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="flex-1 px-5 py-3.5 bg-charcoal/5 border border-charcoal/10 rounded-2xl font-brand font-bold text-xs text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none"
            />
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="Motivo (opzionale)"
              className="flex-1 px-5 py-3.5 bg-charcoal/5 border border-charcoal/10 rounded-2xl font-body text-sm text-charcoal focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none placeholder:text-charcoal/25"
            />
            <button
              onClick={handleAddClosure}
              disabled={!newDate}
              className="px-8 py-3.5 bg-charcoal text-white rounded-2xl font-brand font-bold uppercase tracking-[0.15em] text-[10px] hover:bg-terracotta transition-all active:scale-95 disabled:opacity-40 shrink-0"
            >
              Aggiungi
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-8">
          {closedDates.length === 0 ? (
            <p className="text-center font-body italic text-charcoal/25 text-sm py-4">Nessuna chiusura straordinaria programmata.</p>
          ) : (
            <div className="space-y-3">
              {closedDates.map((c) => {
                const d = new Date(c.date + "T12:00:00");
                return (
                  <div key={c.id} className="flex items-center justify-between gap-4 p-4 bg-charcoal/3 rounded-2xl border border-charcoal/5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-terracotta/10 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-brand font-bold uppercase tracking-widest text-terracotta/60">
                          {d.toLocaleDateString("it-IT", { month: "short" })}
                        </span>
                        <span className="text-lg font-brand font-medium text-terracotta leading-none">{d.getDate()}</span>
                      </div>
                      <div>
                        <p className="font-brand font-bold uppercase tracking-widest text-xs text-charcoal">
                          {d.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        {c.reason && <p className="font-body italic text-[11px] text-charcoal/40 mt-0.5">{c.reason}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteClosure(c.date)}
                      className="text-charcoal/20 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-50 shrink-0"
                      aria-label="Rimuovi chiusura"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
