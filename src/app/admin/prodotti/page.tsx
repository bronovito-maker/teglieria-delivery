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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Prodotti</h1>
        <Link href="/admin/prodotti/nuovo"
          className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
          + Nuovo prodotto
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Prezzo</th>
              <th className="px-4 py-3">Stato</th>
              <th className="px-4 py-3 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.category.name}</td>
                <td className="px-4 py-3">{formatCurrency(Number(p.price))}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {p.active ? "Attivo" : "Inattivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Link href={`/admin/prodotti/${p.id}`} className="text-blue-600 hover:underline">Modifica</Link>
                  <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:underline">Elimina</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <p className="px-4 py-8 text-gray-400 text-center">Nessun prodotto. Creane uno.</p>
        )}
      </div>
    </div>
  );
}
