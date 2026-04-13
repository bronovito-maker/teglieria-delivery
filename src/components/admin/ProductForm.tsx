"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Category = { id: string; name: string };
type SubItem = { name: string; priceDelta?: number; price?: number };

interface ProductFormProps {
  productId?: string;
}

export default function ProductForm({ productId }: ProductFormProps) {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [active, setActive] = useState(true);
  const [kitchenNotes, setKitchenNotes] = useState("");

  const [variants, setVariants] = useState<SubItem[]>([]);
  const [additions, setAdditions] = useState<SubItem[]>([]);
  const [removals, setRemovals] = useState<{ name: string }[]>([]);

  useEffect(() => {
    fetch("/api/categorie").then((r) => r.json()).then(setCategories);

    if (productId) {
      fetch(`/api/prodotti/${productId}`)
        .then((r) => r.json())
        .then((p) => {
          setName(p.name);
          setDescription(p.description || "");
          setPrice(String(p.price));
          setCategoryId(p.categoryId);
          setActive(p.active);
          setKitchenNotes(p.kitchenNotes || "");
          setVariants(p.variants.map((v: any) => ({ name: v.name, priceDelta: Number(v.priceDelta) })));
          setAdditions(p.additions.map((a: any) => ({ name: a.name, price: Number(a.price) })));
          setRemovals(p.removals.map((r: any) => ({ name: r.name })));
        });
    }
  }, [productId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const data = {
      name,
      description: description || null,
      price: parseFloat(price),
      categoryId,
      active,
      kitchenNotes: kitchenNotes || null,
      variants: variants.filter((v) => v.name),
      additions: additions.filter((a) => a.name),
      removals: removals.filter((r) => r.name),
    };

    const url = productId ? `/api/prodotti/${productId}` : "/api/prodotti";
    const method = productId ? "PATCH" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    router.push("/admin/prodotti");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-lg">Informazioni prodotto</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prezzo (EUR) *</label>
            <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria *</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none">
              <option value="">Seleziona...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Note cucina</label>
          <input value={kitchenNotes} onChange={(e) => setKitchenNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
        </div>

        <label className="flex items-center gap-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)}
            className="rounded text-orange-600" />
          <span className="text-sm">Attivo nel menu</span>
        </label>
      </div>

      {/* Varianti */}
      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Varianti</h2>
          <button type="button" onClick={() => setVariants([...variants, { name: "", priceDelta: 0 }])}
            className="text-sm text-orange-600 hover:underline">+ Aggiungi variante</button>
        </div>
        {variants.map((v, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input placeholder="Es. Grande" value={v.name}
              onChange={(e) => { const arr = [...variants]; arr[i] = { ...arr[i], name: e.target.value }; setVariants(arr); }}
              className="flex-1 px-3 py-2 border rounded-lg outline-none" />
            <input type="number" step="0.01" placeholder="Diff. prezzo" value={v.priceDelta || ""}
              onChange={(e) => { const arr = [...variants]; arr[i] = { ...arr[i], priceDelta: parseFloat(e.target.value) || 0 }; setVariants(arr); }}
              className="w-28 px-3 py-2 border rounded-lg outline-none" />
            <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))}
              className="text-red-500 text-sm">Rimuovi</button>
          </div>
        ))}
      </div>

      {/* Aggiunte */}
      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Aggiunte</h2>
          <button type="button" onClick={() => setAdditions([...additions, { name: "", price: 0 }])}
            className="text-sm text-orange-600 hover:underline">+ Aggiungi</button>
        </div>
        {additions.map((a, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input placeholder="Es. Mozzarella extra" value={a.name}
              onChange={(e) => { const arr = [...additions]; arr[i] = { ...arr[i], name: e.target.value }; setAdditions(arr); }}
              className="flex-1 px-3 py-2 border rounded-lg outline-none" />
            <input type="number" step="0.01" placeholder="Prezzo" value={a.price || ""}
              onChange={(e) => { const arr = [...additions]; arr[i] = { ...arr[i], price: parseFloat(e.target.value) || 0 }; setAdditions(arr); }}
              className="w-28 px-3 py-2 border rounded-lg outline-none" />
            <button type="button" onClick={() => setAdditions(additions.filter((_, j) => j !== i))}
              className="text-red-500 text-sm">Rimuovi</button>
          </div>
        ))}
      </div>

      {/* Rimozioni */}
      <div className="bg-white rounded-xl shadow p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Rimozioni</h2>
          <button type="button" onClick={() => setRemovals([...removals, { name: "" }])}
            className="text-sm text-orange-600 hover:underline">+ Aggiungi</button>
        </div>
        {removals.map((r, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input placeholder="Es. Senza cipolla" value={r.name}
              onChange={(e) => { const arr = [...removals]; arr[i] = { ...arr[i], name: e.target.value }; setRemovals(arr); }}
              className="flex-1 px-3 py-2 border rounded-lg outline-none" />
            <button type="button" onClick={() => setRemovals(removals.filter((_, j) => j !== i))}
              className="text-red-500 text-sm">Rimuovi</button>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors">
          {loading ? "Salvataggio..." : productId ? "Salva modifiche" : "Crea prodotto"}
        </button>
        <button type="button" onClick={() => router.push("/admin/prodotti")}
          className="px-6 py-2 border rounded-lg hover:bg-gray-50 transition-colors">
          Annulla
        </button>
      </div>
    </form>
  );
}
