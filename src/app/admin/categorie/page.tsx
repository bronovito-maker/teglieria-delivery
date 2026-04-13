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
    <div>
      <h1 className="text-2xl font-bold mb-6">Categorie</h1>

      <form onSubmit={handleAdd} className="flex gap-2 mb-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nuova categoria..."
          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
        />
        <button
          type="submit"
          className="px-4 py-2 tomato-glass border text-white rounded-xl font-semibold hover:brightness-105 transition-all"
        >
          Aggiungi
        </button>
      </form>

      <div className="bg-white rounded-xl shadow divide-y">
        {categories.map((cat) => (
          <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
            {editingId === cat.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 px-2 py-1 border rounded"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave(cat.id)}
                />
                <button
                  onClick={() => handleSave(cat.id)}
                  className="text-sm text-green-600 hover:underline"
                >
                  Salva
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gray-400 hover:underline"
                >
                  Annulla
                </button>
              </>
            ) : (
              <>
                <span className={`flex-1 ${!cat.active ? "text-gray-400 line-through" : ""}`}>
                  {cat.name}
                </span>
                <span className="text-xs text-gray-400">
                  {cat._count.products} prodotti
                </span>
                <button
                  onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                  className="text-sm text-blue-600 hover:underline"
                >
                  Modifica
                </button>
                <button
                  onClick={() => handleToggle(cat)}
                  className="text-sm text-orange-600 hover:underline"
                >
                  {cat.active ? "Disattiva" : "Attiva"}
                </button>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Elimina
                </button>
              </>
            )}
          </div>
        ))}
        {categories.length === 0 && (
          <p className="px-4 py-6 text-gray-400 text-center">
            Nessuna categoria. Aggiungine una.
          </p>
        )}
      </div>
    </div>
  );
}
