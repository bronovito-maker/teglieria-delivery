"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import type { ProductWithRelations } from "@/types";
import type { CartItemAddition, CartItemRemoval } from "@/types";

interface Props {
  product: ProductWithRelations;
  onClose: () => void;
}

export default function ProductModal({ product, onClose }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [variantDelta, setVariantDelta] = useState(0);
  const [selectedAdditions, setSelectedAdditions] = useState<CartItemAddition[]>([]);
  const [selectedRemovals, setSelectedRemovals] = useState<CartItemRemoval[]>([]);
  const [notes, setNotes] = useState("");

  const basePrice = Number(product.price);
  const additionsTotal = selectedAdditions.reduce((s, a) => s + a.price, 0);
  const unitTotal = basePrice + variantDelta + additionsTotal;
  const total = unitTotal * quantity;

  function toggleAddition(name: string, price: number) {
    setSelectedAdditions((prev) =>
      prev.some((a) => a.name === name)
        ? prev.filter((a) => a.name !== name)
        : [...prev, { name, price }]
    );
  }

  function toggleRemoval(name: string) {
    setSelectedRemovals((prev) =>
      prev.some((r) => r.name === name)
        ? prev.filter((r) => r.name !== name)
        : [...prev, { name }]
    );
  }

  function handleAdd() {
    addItem({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: basePrice,
      variant: selectedVariant || undefined,
      variantPriceDelta: variantDelta,
      additions: selectedAdditions,
      removals: selectedRemovals,
      notes: notes || undefined,
      totalPrice: total,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[85vh] overflow-y-auto border border-red-100/70 shadow-[0_18px_40px_rgba(31,38,135,0.1)]" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">{product.name}</h2>
              {product.description && (
                <p className="text-sm text-gray-500 mt-1">{product.description}</p>
              )}
              <p className="text-[#cf2a1d] font-semibold mt-1">{formatCurrency(basePrice)}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-[#cf2a1d] text-2xl leading-none">&times;</button>
          </div>

          {/* Varianti */}
          {product.variants.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Variante</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setSelectedVariant(null); setVariantDelta(0); }}
                  className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                    !selectedVariant
                      ? "text-white tomato-glass border"
                      : "border-red-100 text-gray-700 hover:bg-red-50/40"
                  }`}
                >
                  Standard
                </button>
                {product.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => { setSelectedVariant(v.name); setVariantDelta(Number(v.priceDelta)); }}
                    className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                      selectedVariant === v.name
                        ? "text-white tomato-glass border"
                        : "border-red-100 text-gray-700 hover:bg-red-50/40"
                    }`}
                  >
                    {v.name} {Number(v.priceDelta) !== 0 && `(${Number(v.priceDelta) > 0 ? "+" : ""}${formatCurrency(Number(v.priceDelta))})`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Aggiunte */}
          {product.additions.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Aggiunte</p>
              <div className="space-y-1.5">
                {product.additions.map((a) => (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAdditions.some((sa) => sa.name === a.name)}
                      onChange={() => toggleAddition(a.name, Number(a.price))}
                      className="rounded text-[#cf2a1d] focus:ring-[#cf2a1d]"
                    />
                    <span className="flex-1">{a.name}</span>
                    {Number(a.price) > 0 && <span className="text-gray-500">+{formatCurrency(Number(a.price))}</span>}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Rimozioni */}
          {product.removals.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Rimozioni</p>
              <div className="space-y-1.5">
                {product.removals.map((r) => (
                  <label key={r.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedRemovals.some((sr) => sr.name === r.name)}
                      onChange={() => toggleRemoval(r.name)}
                      className="rounded text-[#cf2a1d] focus:ring-[#cf2a1d]"
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Note</p>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Es. Ben cotta, poco piccante..."
              className="w-full px-3 py-2 border border-red-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#cf2a1d]"
            />
          </div>

          {/* Quantita + Aggiungi */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center border border-red-100 rounded-xl">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 text-lg hover:bg-red-50/40">-</button>
              <span className="px-3 py-2 font-medium">{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)} className="px-3 py-2 text-lg hover:bg-red-50/40">+</button>
            </div>
            <button
              onClick={handleAdd}
              className="flex-1 py-2.5 text-white rounded-xl font-medium tomato-glass border transition-all hover:brightness-105"
            >
              Aggiungi {formatCurrency(total)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
