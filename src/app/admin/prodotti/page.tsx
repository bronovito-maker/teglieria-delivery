"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { ProductWithRelations } from "@/types";

const actionClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-[9px] font-brand font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2";

function emptyMessage(filter: "all" | "active" | "archived") {
  if (filter === "archived") return "Nessun prodotto archiviato.";
  if (filter === "active") return "Nessun prodotto attivo.";
  return "Nessun prodotto configurato.";
}

export default function ProdottiPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [deleteTarget, setDeleteTarget] = useState<ProductWithRelations | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/prodotti");
    const data = await res.json().catch(() => []);
    if (res.ok) {
      setProducts(Array.isArray(data) ? data : []);
      setError("");
    } else setError(data.error || "Impossibile caricare il catalogo.");
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!deleteTarget) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !deleting) setDeleteTarget(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [deleteTarget, deleting]);

  const visibleProducts = products.filter((product) =>
    filter === "all" || (filter === "active" ? product.active : !product.active)
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/prodotti/${deleteTarget.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setDeleting(false);
    if (!res.ok) {
      setError(data.error || "Impossibile eliminare il prodotto.");
      return;
    }
    setDeleteTarget(null);
    await load();
  }

  return (
    <div className="max-w-7xl animate-in fade-in duration-700">
      <div className="mb-8 flex flex-col gap-6 lg:mb-12 lg:flex-row lg:items-end lg:justify-between">
        <div className="reveal active">
          <span className="ds-micro-label mb-2 block text-terracotta/60">Inventario</span>
          <h1 className="text-4xl font-display leading-none tracking-tight text-charcoal md:text-5xl lg:text-6xl">
            Catalogo <span className="text-terracotta">Prodotti.</span>
          </h1>
          <p className="mt-3 text-sm font-body italic text-charcoal/45">Gestione menu, disponibilità e struttura del catalogo</p>
        </div>
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex rounded-full border border-charcoal/10 bg-white/70 p-1" aria-label="Filtra prodotti">
            {([["all", "Tutti"], ["active", "Attivi"], ["archived", "Archiviati"]] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={`min-h-11 flex-1 rounded-full px-4 text-[9px] font-brand font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta sm:flex-none ${filter === value ? "bg-charcoal text-white" : "text-charcoal/50 hover:text-charcoal"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <Link href="/admin/prodotti/nuovo" className="inline-flex min-h-11 items-center justify-center rounded-full bg-charcoal px-8 text-[10px] font-brand font-semibold uppercase tracking-[0.2em] text-white shadow-2xl shadow-charcoal/20 transition-all hover:bg-terracotta focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terracotta focus-visible:ring-offset-2 active:scale-95">
            + Aggiungi Prodotto
          </Link>
        </div>
      </div>

      {error && <p role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">{error}</p>}

      <section data-testid="mobile-product-catalog" aria-label="Catalogo prodotti" className="space-y-4 xl:hidden">
        {visibleProducts.map((product) => (
          <article key={product.id} data-testid="mobile-product-card" className="overflow-hidden rounded-[2rem] border border-charcoal/5 bg-white/80 p-5 shadow-xl shadow-charcoal/5 backdrop-blur-2xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-brand font-semibold text-charcoal">{product.name}</h2>
                <p className="mt-1 break-all text-[9px] font-brand font-semibold uppercase tracking-widest text-charcoal/35">ID: {product.id}</p>
              </div>
              <span className={`shrink-0 rounded-full border px-3 py-2 text-[9px] font-brand font-semibold uppercase tracking-[0.12em] ${product.active ? "border-green-100 bg-green-50 text-green-700" : "border-charcoal/10 bg-charcoal/5 text-charcoal/50"}`}>
                {product.active ? "Disponibile" : "Archiviato"}
              </span>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-4 border-y border-charcoal/5 py-4 sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-[9px] font-brand font-semibold uppercase tracking-[0.18em] text-charcoal/35">Categoria</dt>
                <dd className="mt-1 break-words text-sm font-brand font-semibold text-charcoal/70">{product.category.name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-[9px] font-brand font-semibold uppercase tracking-[0.18em] text-charcoal/35">Prezzo</dt>
                <dd className="mt-1 text-sm font-brand font-semibold text-charcoal">{product.configuration ? "Prezzo variabile" : formatCurrency(Number(product.price))}</dd>
                {product.configuration && <span className="mt-1 block text-[10px] font-brand uppercase tracking-wider text-terracotta">Prodotto configurabile</span>}
              </div>
            </dl>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap" aria-label={`Azioni per ${product.name}`}>
              <Link href={`/admin/prodotti/${product.id}`} className={`${actionClass} border-charcoal/10 text-charcoal hover:border-charcoal/30`}>Modifica</Link>
              {product.configuration && (
                <Link href={`/admin/ordini/nuovo?product=${encodeURIComponent(product.id)}`} className={`${actionClass} border-terracotta bg-terracotta text-white hover:bg-terracotta/90`}>Configura</Link>
              )}
              <button type="button" onClick={() => setDeleteTarget(product)} className={`${actionClass} border-red-100 text-red-500 hover:border-red-300 hover:text-red-700`}>Elimina</button>
            </div>
          </article>
        ))}
        {visibleProducts.length === 0 && (
          <div className="rounded-[2rem] border border-charcoal/5 bg-white/70 px-5 py-16 text-center">
            <p className="text-xs font-brand font-bold uppercase tracking-[0.2em] text-charcoal/25">{emptyMessage(filter)}</p>
          </div>
        )}
      </section>

      <div data-testid="desktop-product-catalog" className="hidden overflow-hidden rounded-[3rem] border border-charcoal/5 bg-white/70 shadow-2xl backdrop-blur-2xl xl:block">
        <table className="w-full table-fixed border-collapse">
          <thead>
            <tr className="border-b border-charcoal/5">
              <th className="w-[27%] px-5 py-6 text-left text-[10px] font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/40 xl:px-8 xl:tracking-[0.3em]">Nome Prodotto</th>
              <th className="w-[18%] px-5 py-6 text-left text-[10px] font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/40 xl:px-8 xl:tracking-[0.3em]">Categoria</th>
              <th className="w-[19%] px-5 py-6 text-left text-[10px] font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/40 xl:px-8 xl:tracking-[0.3em]">Prezzo</th>
              <th className="w-[14%] px-5 py-6 text-center text-[10px] font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/40 xl:px-8 xl:tracking-[0.3em]">Stato</th>
              <th className="w-[22%] px-5 py-6 text-right text-[10px] font-brand font-semibold uppercase tracking-[0.2em] text-charcoal/40 xl:px-8 xl:tracking-[0.3em]">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {visibleProducts.map((product) => (
              <tr key={product.id} className="group transition-colors hover:bg-warm-light/50">
                <td className="px-5 py-5 xl:px-8">
                  <p className="break-words text-lg font-brand font-semibold text-charcoal">{product.name}</p>
                  <p className="mt-0.5 text-[9px] font-brand font-semibold uppercase tracking-widest text-charcoal/20">ID: {product.id.slice(0, 8)}</p>
                </td>
                <td className="px-5 py-5 xl:px-8"><span className="inline-block max-w-full break-words rounded-full bg-charcoal/5 px-3 py-1 text-[11px] font-brand font-semibold uppercase tracking-wider text-charcoal/60">{product.category.name}</span></td>
                <td className="px-5 py-5 font-brand font-semibold text-charcoal xl:px-8">{product.configuration ? "Prezzo variabile" : formatCurrency(Number(product.price))}</td>
                <td className="px-5 py-5 text-center xl:px-8">
                  <span className={`inline-block rounded-full border px-3 py-2 text-[9px] font-brand font-semibold uppercase tracking-[0.12em] ${product.active ? "border-green-100 bg-green-50 text-green-700" : "border-charcoal/10 bg-charcoal/5 text-charcoal/50"}`}>{product.active ? "Disponibile" : "Archiviato"}</span>
                </td>
                <td className="px-4 py-4 xl:px-6">
                  <div className="flex flex-wrap justify-end gap-2" aria-label={`Azioni per ${product.name}`}>
                    <Link href={`/admin/prodotti/${product.id}`} className={`${actionClass} border-transparent px-3 text-charcoal hover:text-terracotta`}>Modifica</Link>
                    {product.configuration && <Link href={`/admin/ordini/nuovo?product=${encodeURIComponent(product.id)}`} className={`${actionClass} border-terracotta/30 px-3 text-terracotta hover:bg-terracotta hover:text-white`}>Configura</Link>}
                    <button type="button" onClick={() => setDeleteTarget(product)} className={`${actionClass} border-transparent px-3 text-red-400 hover:text-red-600`}>Elimina</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visibleProducts.length === 0 && <div className="py-20 text-center"><p className="text-xs font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20">{emptyMessage(filter)}</p></div>}
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-charcoal/60 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !deleting) setDeleteTarget(null);
        }}>
          <div role="dialog" aria-modal="true" aria-labelledby="delete-product-title" aria-describedby="delete-product-description" className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8">
            <span className="text-[9px] font-brand font-semibold uppercase tracking-[0.2em] text-red-500">Eliminazione prodotto</span>
            <h2 id="delete-product-title" className="mt-2 text-2xl font-display text-charcoal">Eliminare {deleteTarget.name}?</h2>
            <p id="delete-product-description" className="mt-3 text-sm leading-relaxed text-charcoal/60">Questa azione richiede conferma e non può essere annullata. Se vuoi soltanto nasconderlo dal menu, imposta il prodotto come non disponibile da Modifica.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button autoFocus type="button" disabled={deleting} onClick={() => setDeleteTarget(null)} className={`${actionClass} border-charcoal/10 text-charcoal disabled:opacity-50`}>Indietro</button>
              <button type="button" disabled={deleting} onClick={() => void handleDelete()} className={`${actionClass} border-red-600 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50`}>{deleting ? "Elimino…" : "Elimina"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
