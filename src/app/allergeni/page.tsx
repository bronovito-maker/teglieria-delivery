"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { AllergenSnapshot, PublicRegistry } from "@/lib/allergens/core";
import { resolveIngredient, snapshot } from "@/lib/allergens/core";
import { PIZZA_BUILDER_CONFIG } from "@/lib/pizza-builder";
import AllergenBadges from "@/components/client/AllergenBadges";
import "./print.css";
type Register = PublicRegistry & { generatedAt: string; catalogVersion: string; products: Array<{ id: string; name: string; category: string; configurable: boolean; allergenInfo: AllergenSnapshot }> };
export default function AllergeniPage() {
  const [data,setData] = useState<Register>();
  const [error,setError] = useState("");
  const [printing,setPrinting] = useState(false);
  async function printLive() {
    setPrinting(true); setError("");
    try {
      const response = await fetch("/api/allergeni", { cache: "no-store" });
      const latest = await response.json();
      if (!response.ok) throw new Error(latest.error);
      setData(latest);
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      window.print();
    } catch (e) { setError(e instanceof Error ? e.message : "Impossibile aggiornare il registro per la stampa"); }
    finally { setPrinting(false); }
  }
  useEffect(() => { fetch("/api/allergeni", { cache: "no-store" }).then(async r => { const body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); }).catch(e => setError(e.message)); }, []);
  return <main id="allergen-register" className="mx-auto max-w-5xl px-5 py-10 text-charcoal sm:px-10">
    <nav className="allergen-no-print mb-8"><Link href="/menu" className="underline">← Torna al menu</Link></nav>
    <p className="text-sm font-bold uppercase tracking-widest text-terracotta">La Teglieria</p>
    <h1 className="mt-3 font-display text-3xl sm:text-5xl">La Teglieria - Registro Allergeni</h1>
    <p className="my-6 leading-relaxed">Accanto a ciascun prodotto e ingrediente trovi i numeri riferiti alla legenda dei 14 allergeni. Le informazioni sono aggiornate in base alle ricette e alle schede dei prodotti utilizzati. In caso di allergie o intolleranze, informaci sempre prima dell’ordine: nel laboratorio vengono lavorati più allergeni e può verificarsi contaminazione crociata.</p>
    {error && <p role="alert" className="rounded-xl border p-4">{error}</p>}
    {!data && !error && <p role="status">Caricamento del registro…</p>}
    {data && <>
      <p className="mb-4 text-sm">Ultimo aggiornamento: {new Date(data.updatedAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })} · Versione allergeni: {data.version} · Catalogo attivo: {data.catalogVersion}<br />Generato il {new Date(data.generatedAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" })} (Europe/Rome)</p>
      <button onClick={printLive} disabled={printing} className="allergen-no-print mb-8 rounded-full bg-charcoal px-6 py-3 text-sm font-bold text-white">{printing ? "Aggiornamento registro…" : "STAMPA / SALVA PDF"}</button>
      <section aria-labelledby="legend"><h2 id="legend" className="my-5 font-display text-2xl">Legenda dei 14 allergeni</h2>
        <table><thead><tr><th scope="col">N.</th><th scope="col">Allergene</th><th scope="col">Descrizione</th></tr></thead><tbody>{data.graph.master.map(a => <tr key={a.id} id={`allergene-${a.id}`}><th scope="row">{a.id}</th><td>{a.name}</td><td>{a.description}</td></tr>)}</tbody></table>
      </section>
      <section aria-labelledby="products"><h2 id="products" className="my-5 font-display text-2xl">Prodotti attualmente pubblicati</h2>
        <p className="mb-3 text-sm">I numeri indicano gli allergeni noti. Una verifica incompleta non equivale ad assenza di allergeni.</p>
        <table><thead><tr><th scope="col">Prodotto / categoria</th><th scope="col">Allergeni e verifica</th></tr></thead><tbody>{data.products.map(p => <tr key={p.id}><th scope="row">{p.name}<small className="block font-normal">{p.category}</small></th><td>{p.configurable ? "Calcolati in base ai gusti selezionati nel configuratore." : <AllergenBadges info={p.allergenInfo} />}</td></tr>)}</tbody></table>
      </section>
      <section aria-labelledby="ingredients"><h2 id="ingredients" className="my-5 font-display text-2xl">Ingredienti del configuratore</h2>
        <table><thead><tr><th scope="col">Ingrediente / base</th><th scope="col">Allergeni e verifica</th></tr></thead><tbody>{["Base rossa", "Base bianca", "Mozzarella standard", ...PIZZA_BUILDER_CONFIG.ingredients.map(r => r[0])].map(name => <tr key={name}><th scope="row">{name}</th><td><AllergenBadges info={snapshot(data, resolveIngredient(data.graph, name))} /></td></tr>)}</tbody></table>
      </section>
      <p className="mt-8 border-t pt-5 text-sm">Contaminazione crociata: nel laboratorio vengono lavorati più allergeni. Per fritture, attrezzature condivise e richieste specifiche rivolgiti al personale prima dell’ordine.</p>
    </>}
  </main>;
}
