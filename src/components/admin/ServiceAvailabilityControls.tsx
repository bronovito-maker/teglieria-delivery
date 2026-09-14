"use client";

import { useCallback, useEffect, useState } from "react";
import { getRomeDateOffsetString, getRomeDayOfWeek, romeDateTimeToDate } from "@/lib/constants";

type ServiceKey = "delivery" | "pickup";
type Config = {
  deliveryEnabled: boolean;
  deliveryDisabledUntil: string | null;
  pickupEnabled: boolean;
  pickupDisabledUntil: string | null;
};

const serviceDetails = {
  delivery: { title: "Delivery", enabled: "deliveryEnabled", until: "deliveryDisabledUntil", tomorrowHour: 19 },
  pickup: { title: "Asporto", enabled: "pickupEnabled", until: "pickupDisabledUntil", tomorrowHour: 16 },
} as const;

function tomorrowAt(hour: number) {
  let offset = 1;
  while (getRomeDayOfWeek(getRomeDateOffsetString(offset)) === 1) offset += 1;
  return romeDateTimeToDate(getRomeDateOffsetString(offset), `${String(hour).padStart(2, "0")}:00`).toISOString();
}

function deadlineLabel(value: string | null) {
  if (!value) return "fino a riattivazione manuale";
  return `fino a ${new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" }).format(new Date(value))}`;
}

export default function ServiceAvailabilityControls() {
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState<ServiceKey | null>(null);
  const [error, setError] = useState("");
  const [customUntil, setCustomUntil] = useState<Record<ServiceKey, string>>({ delivery: "", pickup: "" });

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/config", { cache: "no-store" });
    if (response.ok) setConfig(await response.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function update(service: ServiceKey, enabled: boolean, disabledUntil: string | null) {
    const details = serviceDetails[service];
    setSaving(service);
    setError("");
    const response = await fetch("/api/admin/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [details.enabled]: enabled, [details.until]: disabledUntil }),
    });
    if (response.ok) setConfig(await response.json());
    else setError((await response.json().catch(() => ({}))).error ?? "Aggiornamento non riuscito");
    setSaving(null);
  }

  if (!config) return <div className="mb-8 h-32 animate-pulse rounded-[2rem] bg-white/50" />;

  return (
    <section className="mb-8 rounded-[2rem] border border-charcoal/5 bg-white/70 p-5 shadow-sm md:p-7" aria-labelledby="service-controls-title">
      <div className="mb-5">
        <p className="text-[10px] font-brand font-bold uppercase tracking-[0.25em] text-terracotta/70">Controllo rapido</p>
        <h2 id="service-controls-title" className="mt-1 font-display text-2xl text-charcoal">Disponibilità servizi</h2>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {(["delivery", "pickup"] as const).map((service) => {
          const details = serviceDetails[service];
          const enabled = config[details.enabled];
          const until = config[details.until];
          const effectivelyEnabled = enabled || Boolean(until && new Date(until) <= new Date());
          return (
            <div key={service} className={`rounded-2xl border p-5 ${effectivelyEnabled ? "border-emerald-200 bg-emerald-50/60" : "border-red-200 bg-red-50/70"}`}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-brand text-lg font-bold text-charcoal">{details.title}</h3>
                  <p className={`mt-1 text-xs font-semibold ${effectivelyEnabled ? "text-emerald-700" : "text-red-700"}`}>
                    {effectivelyEnabled ? "Attivo" : `Sospeso ${deadlineLabel(until)}`}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={saving === service}
                  onClick={() => update(service, !effectivelyEnabled, null)}
                  className={`min-h-11 min-w-24 rounded-full px-5 text-[10px] font-brand font-bold uppercase tracking-widest text-white disabled:opacity-50 ${effectivelyEnabled ? "bg-red-600" : "bg-emerald-600"}`}
                >
                  {effectivelyEnabled ? "Disattiva" : "Riattiva"}
                </button>
              </div>
              {!effectivelyEnabled && (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => update(service, false, new Date(Date.now() + 60 * 60_000).toISOString())} className="min-h-10 rounded-full border border-charcoal/10 bg-white px-4 text-xs font-semibold">Tra 1 ora</button>
                  <button type="button" onClick={() => update(service, false, new Date(Date.now() + 2 * 60 * 60_000).toISOString())} className="min-h-10 rounded-full border border-charcoal/10 bg-white px-4 text-xs font-semibold">Tra 2 ore</button>
                  <button type="button" onClick={() => update(service, false, tomorrowAt(details.tomorrowHour))} className="min-h-10 rounded-full border border-charcoal/10 bg-white px-4 text-xs font-semibold">Domani all’apertura</button>
                  <div className="flex w-full gap-2 pt-1">
                    <input
                      type="datetime-local"
                      aria-label={`Data e ora riattivazione ${details.title}`}
                      value={customUntil[service]}
                      min={new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16)}
                      onChange={(event) => setCustomUntil((current) => ({ ...current, [service]: event.target.value }))}
                      className="min-h-11 min-w-0 flex-1 rounded-xl border border-charcoal/10 bg-white px-3 text-xs"
                    />
                    <button
                      type="button"
                      disabled={!customUntil[service]}
                      onClick={() => update(service, false, new Date(customUntil[service]).toISOString())}
                      className="min-h-11 rounded-xl bg-charcoal px-4 text-xs font-bold text-white disabled:opacity-30"
                    >
                      Imposta
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-4 text-sm font-semibold text-red-600">{error}</p>}
    </section>
  );
}
