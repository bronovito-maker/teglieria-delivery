"use client";

import { useEffect, useState } from "react";

type Category = {
  id: string;
  name: string;
  sortOrder: number;
  active: boolean;
  _count: { products: number };
};

export default function CategoriePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() {
    const res = await fetch("/api/categorie");
    setCategories(await res.json());
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await fetch("/api/categorie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sortOrder: categories.length }),
    });
    setName("");
    load();
  }

  async function handleSave(id: string) {
    await fetch("/api/categorie", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name: editName }),
    });
    setEditingId(null);
    load();
  }

  async function handleToggle(cat: Category) {
    await fetch("/api/categorie", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: cat.id, active: !cat.active }),
    });
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminare questa categoria?")) return;
    await fetch(`/api/categorie?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="max-w-4xl animate-in fade-in duration-700">
      <div className="reveal active mb-12">
        <span className="ds-micro-label text-terracotta/60 mb-2 block">Organizzazione</span>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display tracking-tight text-charcoal leading-none">
          Categorie <span className="text-terracotta">Menu.</span>
        </h1>
        <p className="font-body italic text-charcoal/45 mt-3 text-sm">Struttura delle portate, ordine del catalogo e attivazione categorie</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-4 mb-12 bg-white/50 backdrop-blur-xl p-6 rounded-[2.5rem] border border-charcoal/5 shadow-sm reveal active">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome nuova categoria..."
          className="flex-1 px-8 py-4 bg-white border border-charcoal/5 rounded-full font-body italic text-sm focus:ring-2 focus:ring-terracotta/20 focus:border-terracotta outline-none transition-all shadow-sm"
        />
        <button
          type="submit"
          className="px-8 py-4 bg-charcoal text-white rounded-full font-brand font-semibold uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-charcoal/20 hover:bg-terracotta transition-all active:scale-95"
        >
          Aggiungi
        </button>
      </form>

      <div className="bg-white/70 backdrop-blur-2xl rounded-[3rem] border border-charcoal/5 shadow-2xl overflow-hidden divide-y divide-charcoal/5 reveal active">
        {categories.map((cat) => (
          <div key={cat.id} className="group flex items-center gap-6 px-10 py-8 hover:bg-warm-light/50 transition-colors">
            {editingId === cat.id ? (
              <div className="flex-1 flex items-center gap-4 animate-in slide-in-from-left-4">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-6 py-3 bg-white border border-terracotta rounded-full font-body italic text-sm outline-none shadow-inner"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave(cat.id)}
                />
                <button
                  onClick={() => handleSave(cat.id)}
                  className="font-brand font-semibold uppercase tracking-widest text-[9px] text-green-600 hover:text-green-700 transition-colors"
                >
                  Salva
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="font-brand font-semibold uppercase tracking-widest text-[9px] text-charcoal/40 hover:text-charcoal transition-colors"
                >
                  Annulla
                </button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <span className={`font-brand font-semibold text-xl tracking-tight transition-colors ${!cat.active ? "text-charcoal/20 line-through" : "text-charcoal"}`}>
                    {cat.name}
                  </span>
                  <p className="text-[9px] uppercase font-brand font-semibold tracking-[0.3em] text-charcoal/20 mt-1">
                    {cat._count.products} Referenze Associate
                  </p>
                </div>
                <div className="flex items-center gap-6">
                  <button
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    className="font-brand font-semibold uppercase tracking-widest text-[9px] text-charcoal/40 hover:text-charcoal transition-colors"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => handleToggle(cat)}
                    className={`font-brand font-semibold uppercase tracking-widest text-[9px] transition-colors ${cat.active ? "text-marigold hover:text-terracotta" : "text-green-600 hover:text-green-700"}`}
                  >
                    {cat.active ? "Disattiva" : "Attiva"}
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="font-brand font-semibold uppercase tracking-widest text-[9px] text-red-300 hover:text-red-500 transition-colors"
                  >
                    Elimina
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <div className="py-20 text-center">
            <p className="font-brand font-bold uppercase tracking-[0.2em] text-charcoal/20 text-xs">Nessuna categoria configurata.</p>
          </div>
        )}
      </div>
    </div>
  );
}
