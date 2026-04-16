"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import type { ProductWithRelations } from "@/types";

export default function ProdottiPage() {
  const [products, setProducts] = useState<ProductWithRelations[]>([]);

  async function load() {
    const res = await fetch("/api/prodotti");
    setProducts(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questo prodotto?")) return;
    await fetch(`/api/prodotti/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-7xl animate-in fade-in duration-700">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-12">
        <div className="reveal active">
          <span className="text-[10px] font-brand font-bold uppercase tracking-[0.4em] text-terracotta/60 mb-2 block">Inventario</span>
          <h1 className="text-5xl md:text-6xl font-display tracking-tight text-charcoal">
            Catalogo <span className="text-terracotta">Prodotti.</span>
          </h1>
          <p className="font-body italic text-charcoal/40 mt-2 tracking-widest uppercase text-[10px]">Gestione menu e disponibilità</p>
        </div>
        <Link href="/admin/prodotti/nuovo"
          className="w-fit px-8 py-4 bg-charcoal text-white rounded-full font-brand font-bold uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-charcoal/20 hover:bg-terracotta transition-all active:scale-95">
          + Aggiungi Prodotto
        </Link>
      </div>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden reveal active">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-charcoal/5">
              <th className="px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Nome Prodotto</th>
              <th className="px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Categoria</th>
              <th className="px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Prezzo</th>
              <th className="px-8 py-6 text-left text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40 text-center">Stato</th>
              <th className="px-8 py-6 text-right text-[10px] font-brand font-bold uppercase tracking-[0.3em] text-charcoal/40">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {products.map((p) => (
              <tr key={p.id} className="group hover:bg-warm-light/50 transition-colors">
                <td className="px-8 py-6">
                   <p className="font-brand font-bold text-lg text-charcoal">{p.name}</p>
                   <p className="text-[9px] uppercase font-brand font-bold tracking-widest text-charcoal/20 mt-0.5">ID: {p.id.slice(0, 8)}</p>
                </td>
                <td className="px-8 py-6">
                   <span className="font-brand font-bold uppercase tracking-widest text-[11px] text-charcoal/60 bg-charcoal/5 px-3 py-1 rounded-full">{p.category.name}</span>
                </td>
                <td className="px-8 py-6 font-brand font-bold text-charcoal">{formatCurrency(Number(p.price))}</td>
                <td className="px-8 py-6 text-center">
                  <span className={`inline-block px-4 py-1.5 rounded-full text-[9px] font-brand font-bold uppercase tracking-widest border ${
                    p.active ? "bg-green-50 text-green-600 border-green-100" : "bg-charcoal/5 text-charcoal/40 border-charcoal/10"
                  }`}>
                    {p.active ? "Disponibile" : "Esaurito"}
                  </span>
                </td>
                <td className="px-8 py-6 text-right space-x-4">
                  <Link href={`/admin/prodotti/${p.id}`} 
                    className="font-brand font-bold uppercase tracking-widest text-[9px] text-charcoal hover:text-terracotta transition-colors">
                    Modifica
                  </Link>
                  <button onClick={() => handleDelete(p.id)} 
                    className="font-brand font-bold uppercase tracking-widest text-[9px] text-red-400 hover:text-red-600 transition-colors">
                    Elimina
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20 text-xs">Nessun prodotto configurato.</p>
          </div>
        )}
      </div>
    </div>
  );
}
