"use client";
import type { AllergenSnapshot } from "@/lib/allergens/core";
export default function AllergenBadges({ info, interactive = true }: { info?: AllergenSnapshot; interactive?: boolean }) {
  if (!info) return <span className="block text-xs text-charcoal/70">Allergeni da verificare con il personale</span>;
  if (!interactive && !info.ids.length && !info.pending.length) return null;
  return <span className="inline-flex max-w-full flex-wrap items-center gap-1.5 text-xs font-body font-semibold normal-case tracking-normal" aria-label="Informazioni allergeni">
    {info.allergens.map(a => interactive ? <a key={a.id} href={`/allergeni#allergene-${a.id}`} target="_blank" rel="noopener" onClick={e => e.stopPropagation()} title={`${a.id} - ${a.name}`} aria-label={`${a.id} - ${a.name}. Apri legenda allergeni in una nuova scheda`} className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-terracotta/[.08] px-1.5 text-[11px] font-semibold text-[#995025] transition-colors hover:bg-terracotta/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-terracotta">{a.id}</a> : <span className="inline-flex items-center gap-1 text-[10px] text-charcoal/60" key={a.id} title={`${a.id} - ${a.name}`} aria-label={`${a.id} - ${a.name}`}><span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-terracotta/10 px-1 text-[9px] font-semibold text-[#995025]">{a.id}</span>{a.name}</span>)}
    {!interactive && info.pending.length > 0 && <span className="basis-full text-xs font-normal text-charcoal/80">Da verificare</span>}
    {!info.ids.length && !info.pending.length && <span className="text-xs font-normal">Verificato: nessuno dei 14 allergeni nella composizione.</span>}
  </span>;
}
