"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import type { CategoryWithProducts, ProductWithRelations } from "@/types";

type CartLine = {
  product: ProductWithRelations;
  quantity: number;
  variant?: string;
  variantDelta: number;
  additions: { name: string; price: number }[];
  notes?: string;
};

export default function NuovoOrdinePage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(false);

  // Order fields
  const [type, setType] = useState<"ASPORTO" | "DELIVERY">("ASPORTO");
  const [channel, setChannel] = useState<"PHONE" | "COUNTER">("PHONE");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressDetail, setAddressDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/menu").then((r) => r.json()).then(setCategories);
  }, []);

  const allProducts = categories.flatMap((c) => c.products);
  const filteredProducts = search.length >= 2
    ? allProducts.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    : [];

  function addProduct(product: ProductWithRelations) {
    setLines([...lines, { product, quantity: 1, variantDelta: 0, additions: [] }]);
    setSearch("");
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, updates: Partial<CartLine>) {
    setLines(lines.map((l, i) => (i === index ? { ...l, ...updates } : l)));
  }

  const subtotal = lines.reduce((sum, l) => {
    const unitPrice = Number(l.product.price) + l.variantDelta + l.additions.reduce((s, a) => s + a.price, 0);
    return sum + unitPrice * l.quantity;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setLoading(true);

    const items = lines.map((l) => {
      const unitPrice = Number(l.product.price) + l.variantDelta + l.additions.reduce((s, a) => s + a.price, 0);
      return {
        productId: l.product.id,
        productName: l.product.name,
        quantity: l.quantity,
        unitPrice,
        totalPrice: unitPrice * l.quantity,
        variant: l.variant,
        additions: l.additions.length > 0 ? l.additions : null,
        removals: null,
        notes: l.notes,
      };
    });

    const res = await fetch("/api/ordini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        channel,
        customerName,
        customerPhone,
        address: type === "DELIVERY" ? address : null,
        addressDetail: type === "DELIVERY" ? addressDetail : null,
        subtotal,
        total: subtotal,
        notes: notes || null,
        items,
      }),
    });

    if (res.ok) {
      const order = await res.json();
      // Auto-confirm manual orders
      await fetch(`/api/ordini/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CONFIRMED" }),
      });
      router.push(`/admin/ordini/${order.id}`);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-6">Nuovo ordine manuale</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo + Canale */}
        <div className="flex gap-3">
          <div className="flex rounded-lg border overflow-hidden">
            {(["ASPORTO", "DELIVERY"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${type === t ? "bg-orange-600 text-white" : "hover:bg-gray-50"}`}>
                {t === "ASPORTO" ? "Asporto" : "Delivery"}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border overflow-hidden">
            {(["PHONE", "COUNTER"] as const).map((c) => (
              <button key={c} type="button" onClick={() => setChannel(c)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${channel === c ? "bg-gray-800 text-white" : "hover:bg-gray-50"}`}>
                {c === "PHONE" ? "Telefono" : "Banco"}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white rounded-xl shadow p-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Nome</label>
            <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Telefono</label>
            <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} required
              className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
          {type === "DELIVERY" && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Indirizzo</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} required
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Citofono/Piano</label>
                <input value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </>
          )}
        </div>

        {/* Ricerca prodotti */}
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-xs text-gray-500 mb-1">Cerca prodotto</label>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Digita per cercare..."
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
          {filteredProducts.length > 0 && (
            <div className="mt-2 border rounded-lg divide-y max-h-48 overflow-y-auto">
              {filteredProducts.map((p) => (
                <button key={p.id} type="button" onClick={() => addProduct(p)}
                  className="w-full flex justify-between px-3 py-2 text-sm hover:bg-orange-50 transition-colors text-left">
                  <span>{p.name}</span>
                  <span className="text-orange-600">{formatCurrency(Number(p.price))}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Righe ordine */}
        <div className="bg-white rounded-xl shadow p-4">
          <h2 className="font-semibold text-sm mb-3">Prodotti nell&apos;ordine</h2>
          {lines.length === 0 && <p className="text-gray-400 text-sm">Nessun prodotto aggiunto.</p>}
          <div className="space-y-2">
            {lines.map((line, i) => {
              const unitPrice = Number(line.product.price) + line.variantDelta + line.additions.reduce((s, a) => s + a.price, 0);
              return (
                <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center border rounded text-sm">
                    <button type="button" onClick={() => updateLine(i, { quantity: Math.max(1, line.quantity - 1) })} className="px-2 py-1">-</button>
                    <span className="px-2">{line.quantity}</span>
                    <button type="button" onClick={() => updateLine(i, { quantity: line.quantity + 1 })} className="px-2 py-1">+</button>
                  </div>
                  <span className="flex-1 text-sm font-medium">{line.product.name}</span>
                  <span className="text-sm font-semibold">{formatCurrency(unitPrice * line.quantity)}</span>
                  <button type="button" onClick={() => removeLine(i)} className="text-red-500 text-xs">✕</button>
                </div>
              );
            })}
          </div>
          {lines.length > 0 && (
            <div className="flex justify-between mt-3 pt-3 border-t font-bold">
              <span>Totale</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
          )}
        </div>

        {/* Note */}
        <div className="bg-white rounded-xl shadow p-4">
          <label className="block text-xs text-gray-500 mb-1">Note</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
        </div>

        <button type="submit" disabled={loading || lines.length === 0}
          className="w-full py-3 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:opacity-50 transition-colors">
          {loading ? "Salvataggio..." : "Crea ordine"}
        </button>
      </form>
    </div>
  );
}
