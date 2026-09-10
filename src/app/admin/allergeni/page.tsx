"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { dependsOn, resolveNode, type AllergenNode, type PublicRegistry } from "@/lib/allergens/core";
type AdminData = PublicRegistry & { products: Array<{ id: string; name: string; active: boolean; category: { name: string; active: boolean } }>; audit: Array<{ id: string; version: number; actorId: string; reason: string; createdAt: string }> };
export default function AdminAllergeni() {
  const [data, setData] = useState<AdminData>();
  const [id, setId] = useState("");
  const [node,setNode] = useState<AllergenNode>();
  const [reason,setReason] = useState("");
  const [error,setError] = useState("");
  const [saving,setSaving] = useState(false);
  const [productIds,setProductIds] = useState<string[]>([]);
  async function load() {
    const r = await fetch("/api/admin/allergeni", { cache: "no-store" }); const body = await r.json();
    if (!r.ok) throw new Error(body.error); setData(body);
  }
  useEffect(() => { load().catch(e => setError(e.message)); }, []);
  function select(value: string) {
    setId(value); setNode(data?.graph.nodes[value]); setReason(""); setProductIds([]); setError("");
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const r = await fetch("/api/admin/allergeni", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: data?.version, id, node, reason, productIds }) });
      const body = await r.json(); if (!r.ok) throw new Error(body.error);
      await load(); setReason(""); setNode(undefined); setId("");
    } catch (e) { setError(e instanceof Error ? e.message : "Errore di salvataggio"); }
    finally { setSaving(false); }
  }
  const affected = data?.products.filter(p => p.active && p.category.active && dependsOn(data.graph, data.graph.products[p.id], id)) ?? [];
  const pending = data?.products.filter(p => p.active && p.category.active && resolveNode(data.graph, data.graph.products[p.id]).pending.length) ?? [];
  return <div className="mx-auto max-w-5xl space-y-6 p-5 sm:p-8">
    <h1 className="text-3xl font-bold">Allergeni</h1>
    <p>Ingredienti, semilavorati e ricette condivisi con il sito. Ogni salvataggio aggiorna tutte le dipendenze e registra autore, fonte e motivazione.</p>
    <Link href="/allergeni" target="_blank" className="inline-block underline">Apri registro pubblico / stampa</Link>
    {error && <p role="alert" className="rounded-xl border border-red-400 bg-red-50 p-4">{error}</p>}
    {data && <>
      <div className="rounded-xl border border-amber-500 bg-amber-50 p-4"><strong>Versione {data.version} · {pending.length} prodotti pubblicati con verifiche incomplete</strong><p className="mt-2 text-sm">{pending.map(p => `${p.name} (${p.category.name})`).join(", ") || "Nessuna verifica pendente"}</p></div>
      <label className="block">Ingrediente o ricetta<select value={id} onChange={e => select(e.target.value)} className="mt-2 block w-full rounded border bg-white p-3"><option value="">Seleziona…</option>{Object.entries(data.graph.nodes).sort((a,b) => a[1].name.localeCompare(b[1].name)).map(([key,n]) => <option key={key} value={key}>{n.name} · {n.status} ({key})</option>)}</select></label>
      <button type="button" className="rounded border px-4 py-2" onClick={() => { setId(`item:${crypto.randomUUID()}`); setNode({ name: "", allergens: [], components: [], status: "TO_VERIFY" }); }}>Nuovo ingrediente / ricetta</button>
      {node && <form onSubmit={save} className="space-y-5 rounded-2xl border bg-white p-5">
        <label className="block">Nome<input required value={node.name} onChange={e => setNode({ ...node, name: e.target.value })} className="block w-full rounded border p-2" /></label>
        <fieldset><legend className="mb-3 font-bold">ALLERGENI diretti del componente</legend><div className="grid gap-2 sm:grid-cols-2">{data.graph.master.map(a => <label key={a.id} className="flex gap-2"><input type="checkbox" checked={node.allergens.includes(a.id)} onChange={e => setNode({ ...node, allergens: e.target.checked ? [...node.allergens, a.id] : node.allergens.filter(id => id !== a.id) })} />{a.id} - {a.name}</label>)}</div></fieldset>
        <label className="block">Stato<select value={node.status} onChange={e => setNode({ ...node, status: e.target.value as AllergenNode["status"] })} className="block rounded border p-2"><option value="TO_VERIFY">TO_VERIFY - Da verificare</option><option value="CONFIRMED">CONFIRMED - Confermato</option><option value="NONE_CONFIRMED">NONE_CONFIRMED - Nessuno, verificato</option></select></label>
        <label className="block">Fonte<select value={node.sourceType ?? ""} onChange={e => setNode({ ...node, sourceType: e.target.value as AllergenNode["sourceType"] })} className="block rounded border p-2"><option value="">Seleziona…</option><option value="RECIPE">Ricetta interna</option><option value="LABEL">Etichetta</option><option value="TECH_SHEET">Scheda tecnica</option></select></label>
        <label className="block">Riferimento documento / fornitore / lotto<input value={node.sourceRef ?? ""} required={node.status !== "TO_VERIFY"} onChange={e => setNode({ ...node, sourceRef: e.target.value })} className="block w-full rounded border p-2" /></label>
        <label className="block">Componenti della ricetta (selezione multipla)<select multiple value={node.components} onChange={e => setNode({ ...node, components: Array.from(e.target.selectedOptions, o => o.value) })} className="block h-44 w-full rounded border p-2">{Object.entries(data.graph.nodes).filter(([key]) => key !== id).map(([key,n]) => <option key={key} value={key}>{n.name} ({key})</option>)}</select></label>
        <p className="rounded border p-3 text-sm"><strong>Prodotti pubblicati interessati ({affected.length}):</strong> {affected.map(p => `${p.name} - ${p.category.name}`).join(", ") || "Nessuno"}</p>
        <label className="block">Associa questa ricetta a prodotti (opzionale)<select multiple value={productIds} onChange={e => setProductIds(Array.from(e.target.selectedOptions, o => o.value))} className="block h-32 w-full rounded border p-2">{data.products.map(p => <option key={p.id} value={p.id}>{p.name} - {p.category.name}</option>)}</select></label>
        <label className="block">Motivazione della modifica<textarea required minLength={5} value={reason} onChange={e => setReason(e.target.value)} className="block w-full rounded border p-2" /></label>
        <p className="text-sm">Ultima verifica: {node.verifiedAt ?? "Da completare"} · Autore: {node.verifiedBy ?? "Importazione iniziale"}</p>
        <button disabled={saving} className="rounded-full bg-charcoal px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? "Salvataggio…" : "Salva e aggiorna le dipendenze"}</button>
      </form>}
      <section><h2 className="mb-3 text-xl font-bold">Audit delle ultime 30 versioni</h2><ul className="space-y-2">{data.audit.map(a => <li key={a.id} className="rounded border bg-white p-3 text-sm">v{a.version} · {new Date(a.createdAt).toLocaleString("it-IT")} · {a.actorId}<p>{a.reason}</p></li>)}</ul></section>
    </>}
  </div>;
}
