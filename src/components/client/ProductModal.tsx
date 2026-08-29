"use client";

import { useState } from "react";
import Image from "next/image";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import type { ProductWithRelations } from "@/types";
import type { CartItemAddition, CartItemRemoval } from "@/types";
import { toast } from "sonner";

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
  const standardBasePrice = Number(product.standardPrice ?? product.price);
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
      standardUnitPrice: standardBasePrice + variantDelta + additionsTotal,
      variant: selectedVariant || undefined,
      variantPriceDelta: variantDelta,
      additions: selectedAdditions,
      removals: selectedRemovals,
      notes: notes || undefined,
      totalPrice: total,
    });
    toast.success(`${product.name} aggiunta al carrello`, {
      description: quantity > 1 ? `Quantità: ${quantity}` : "Perfetto, continua con il menu.",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm" onClick={onClose}>
      <div className="bg-warm-light w-full sm:max-w-md sm:rounded-[2.5rem] rounded-t-[2.5rem] max-h-[90vh] overflow-y-auto border border-charcoal/5 shadow-2xl transition-all duration-500 ease-out translate-y-0" onClick={(e) => e.stopPropagation()}>

        {/* Immagine hero (se presente) */}
        {product.imageUrl && (
          <div className="relative w-full h-52 rounded-t-[2.5rem] overflow-hidden">
            <Image
              src={product.imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              sizes="(max-width: 448px) 100vw, 448px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-warm-light/60 to-transparent" />
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full bg-white/80 backdrop-blur-sm text-charcoal/60 hover:text-terracotta transition-colors text-xl shadow-sm"
            >
              &times;
            </button>
          </div>
        )}

        <div className="p-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h2 className="text-4xl font-display tracking-tight text-charcoal leading-none mb-2">{product.name}</h2>
              {product.description && (
                <p className="text-base text-charcoal/60 font-body leading-relaxed">{product.description}</p>
              )}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-2xl font-bold text-terracotta">{formatCurrency(unitTotal)}</span>
                {quantity > 1 && (
                  <span className="text-sm text-charcoal/40 font-medium">({formatCurrency(unitTotal)} cad.)</span>
                )}
              </div>
            </div>
            {!product.imageUrl && (
              <button
                onClick={onClose}
                className="ml-4 w-10 h-10 flex items-center justify-center rounded-full bg-charcoal/5 text-charcoal/40 hover:text-terracotta transition-colors text-2xl"
              >
                &times;
              </button>
            )}
          </div>

          <div className="space-y-8">
            {/* Varianti */}
            {product.variants.length > 0 && (
              <section className="reveal active">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-charcoal/40 mb-4 ml-1">Scegli la variante</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setSelectedVariant(null); setVariantDelta(0); }}
                    className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${
                      !selectedVariant
                        ? "bg-terracotta text-white border-terracotta shadow-lg scale-105"
                        : "border-charcoal/10 text-charcoal/60 hover:bg-charcoal/5"
                    }`}
                  >
                    Standard
                  </button>
                  {product.variants.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => { setSelectedVariant(v.name); setVariantDelta(Number(v.priceDelta)); }}
                      className={`px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest border transition-all ${
                        selectedVariant === v.name
                          ? "bg-terracotta text-white border-terracotta shadow-lg scale-105"
                          : "border-charcoal/10 text-charcoal/60 hover:bg-charcoal/5"
                      }`}
                    >
                      {v.name} {Number(v.priceDelta) !== 0 && `(${Number(v.priceDelta) > 0 ? "+" : ""}${formatCurrency(Number(v.priceDelta))})`}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Aggiunte */}
            {product.additions.length > 0 && (
              <section className="reveal active">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-charcoal/40 mb-4 ml-1">Personalizza (Extra)</h3>
                <div className="bg-charcoal/5 rounded-[2rem] p-4 space-y-2">
                  {product.additions.map((a) => (
                    <label key={a.id} className="flex items-center gap-4 p-3 rounded-2xl cursor-pointer hover:bg-white/50 transition-colors group">
                      <div className="relative flex items-center justify-center w-5 h-5">
                        <input
                          type="checkbox"
                          checked={selectedAdditions.some((sa) => sa.name === a.name)}
                          onChange={() => toggleAddition(a.name, Number(a.price))}
                          className="peer appearance-none w-5 h-5 rounded-md border-2 border-charcoal/20 checked:bg-terracotta checked:border-terracotta transition-all cursor-pointer"
                        />
                        <svg className="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className="flex-1 text-sm font-bold text-charcoal/80 group-hover:text-charcoal transition-colors">{a.name}</span>
                      {Number(a.price) > 0 && <span className="text-xs font-bold text-terracotta/80">+{formatCurrency(Number(a.price))}</span>}
                    </label>
                  ))}
                </div>
              </section>
            )}

            {/* Rimozioni */}
            {product.removals.length > 0 && (
              <section className="reveal active">
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-charcoal/40 mb-4 ml-1">Rimuovi Ingredienti</h3>
                <div className="flex flex-wrap gap-2">
                  {product.removals.map((r) => {
                    const isRemoved = selectedRemovals.some((sr) => sr.name === r.name);
                    return (
                      <button
                        key={r.id}
                        onClick={() => toggleRemoval(r.name)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all flex items-center gap-2 ${
                          isRemoved
                            ? "bg-charcoal text-white line-through opacity-60"
                            : "bg-charcoal/5 text-charcoal hover:bg-charcoal/10"
                        }`}
                      >
                        {isRemoved ? "✕" : "−"} {r.name}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}


            {/* Azioni finali desktop */}
            <div className="hidden sm:flex pt-6 border-t border-charcoal/5 items-center gap-4">
              <div className="flex items-center bg-charcoal/5 rounded-full p-1 border border-charcoal/5">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                  className="w-10 h-10 flex items-center justify-center text-xl font-bold text-charcoal hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  −
                </button>
                <span className="w-12 text-center font-bold text-lg text-charcoal">{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)} 
                  className="w-10 h-10 flex items-center justify-center text-xl font-bold text-charcoal hover:bg-white rounded-full transition-colors shadow-sm"
                >
                  +
                </button>
              </div>
              <button
                onClick={handleAdd}
                className="flex-1 py-4 text-white rounded-full font-bold uppercase tracking-widest text-sm bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all transform"
              >
                Aggiungi • {formatCurrency(total)}
              </button>
            </div>

            {/* Azioni finali mobile sticky */}
            <div className="sm:hidden sticky bottom-0 -mx-8 px-4 pt-3 pb-[max(0.9rem,env(safe-area-inset-bottom))] bg-[linear-gradient(180deg,rgba(250,246,240,0)_0%,rgba(250,246,240,0.92)_24%,rgba(250,246,240,0.99)_100%)] border-t border-charcoal/8 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-charcoal/5 rounded-full p-1 border border-charcoal/5 shrink-0">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-9 h-9 flex items-center justify-center text-lg font-bold text-charcoal hover:bg-white rounded-full transition-colors shadow-sm"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-bold text-base text-charcoal">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-9 h-9 flex items-center justify-center text-lg font-bold text-charcoal hover:bg-white rounded-full transition-colors shadow-sm"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={handleAdd}
                  className="flex-1 py-3.5 text-white rounded-full font-bold uppercase tracking-widest text-xs bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] shadow-xl hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  Aggiungi • {formatCurrency(total)}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
