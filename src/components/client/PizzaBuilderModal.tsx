"use client";

import { useMemo, useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import { calculatePizzaConfiguration, pizzaIngredientData, PIZZA_BUILDER_CONFIG, type PizzaBuilderSelection, type PizzaFormat } from "@/lib/pizza-builder";
import type { ProductWithRelations } from "@/types";
import { toast } from "sonner";

export default function PizzaBuilderModal({ product, onClose }: { product: ProductWithRelations; onClose: () => void }) {
  const addItem = useCartStore((s) => s.addItem);
  const [format, setFormat] = useState<PizzaFormat>("INTERA");
  const [gusti, setGusti] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [slots, setSlots] = useState<PizzaBuilderSelection["slots"]>([{ base: "ROSSA", ingredients: [] }]);
  const [included, setIncluded] = useState<string[]>([]);

  const selection: PizzaBuilderSelection = { format, gusti, slots };
  const calculated = useMemo(() => calculatePizzaConfiguration({ format, gusti, slots }), [format, gusti, slots]);
  const setFormatAndGusti = (nextFormat: PizzaFormat, nextGusti: number) => {
    setFormat(nextFormat); setGusti(nextGusti);
    setSlots(Array.from({ length: nextGusti }, (_, i) => slots[i] ?? ({ base: "ROSSA", ingredients: [] })));
  };
  const updateSlot = (index: number, patch: Partial<PizzaBuilderSelection["slots"][number]>) => setSlots((prev) => prev.map((slot, i) => i === index ? { ...slot, ...patch } : slot));
  const toggleIngredient = (slotIndex: number, name: string) => setSlots((prev) => prev.map((slot, i) => i !== slotIndex ? slot : { ...slot, ingredients: slot.ingredients.includes(name) ? slot.ingredients.filter((item) => item !== name) : [...slot.ingredients, name] }));
  const toggleIncluded = (name: string) => setIncluded((prev) => prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]);

  function handleAdd() {
    addItem({ productId: product.id, productName: product.name, quantity, unitPrice: 0, standardUnitPrice: calculated.total, variant: JSON.stringify(selection), variantPriceDelta: 0, additions: calculated.additions, removals: [], notes: included.length ? `Condimenti inclusi: ${included.join(", ")}` : undefined, totalPrice: calculated.total * quantity });
    toast.success("Pizza componibile aggiunta al carrello"); onClose();
  }

  return <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center backdrop-blur-sm">
    <div className="bg-warm-light w-full sm:max-w-2xl sm:rounded-[2.5rem] rounded-t-[2.5rem] max-h-[92vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="p-6 sm:p-8">
        <div className="flex justify-between items-start mb-6"><div><span className="ds-micro-label text-terracotta/60">Configuratore</span><h2 className="text-4xl font-display tracking-tight text-charcoal leading-none mt-2">Crea la tua pizza</h2><p className="text-sm text-charcoal/55 mt-2">Scegli il formato, crea i tuoi gusti e aggiungi gli ingredienti che preferisci. Più ingredienti nello stesso gusto non significano più gusti.</p></div><button onClick={onClose} aria-label="Chiudi" className="w-10 h-10 rounded-full bg-charcoal/5 text-2xl text-charcoal/50">×</button></div>
        <div className="grid grid-cols-2 gap-2 mb-4">{(["INTERA", "MEZZA"] as PizzaFormat[]).map((value) => <button key={value} onClick={() => setFormatAndGusti(value, value === "INTERA" ? 1 : 1)} className={`rounded-2xl border p-3 text-left ${format === value ? "border-terracotta bg-terracotta/10" : "border-charcoal/10 bg-white"}`}><b className="block text-sm">{value === "INTERA" ? "Teglia intera · 60×40 cm" : "Mezza teglia · 30×40 cm"}</b><span className="text-xs text-charcoal/50">Da 1 a {PIZZA_BUILDER_CONFIG.formats[value].gusti[PIZZA_BUILDER_CONFIG.formats[value].gusti.length - 1]} gusti</span></button>)}</div>
        <div className="flex gap-2 mb-6">{PIZZA_BUILDER_CONFIG.formats[format].gusti.map((value) => <button key={value} onClick={() => setFormatAndGusti(format, value)} className={`flex-1 rounded-full py-2 text-xs font-bold uppercase border ${gusti === value ? "bg-terracotta text-white border-terracotta" : "border-charcoal/10 bg-white text-charcoal/60"}`}>{value} {value === 1 ? "gusto" : "gusti"}</button>)}</div>
        <div className="space-y-4">{slots.map((slot, index) => <section key={index} className="rounded-3xl border border-charcoal/8 bg-white p-4 sm:p-5"><div className="flex justify-between items-center mb-3"><h3 className="font-display text-2xl">Gusto {index + 1}</h3><span className="text-sm font-bold text-terracotta">{formatCurrency((() => { const base = PIZZA_BUILDER_CONFIG.bases[slot.base].prices[format][gusti - 1]; const mozzarella = slot.base === "ROSSA" && slot.mozzarellaStandard ? PIZZA_BUILDER_CONFIG.mozzarellaStandard.prices[format][gusti - 1] : 0; return base + mozzarella + slot.ingredients.reduce((sum, name) => sum + (pizzaIngredientData(name, format, gusti)?.price ?? 0), 0); })())}</span></div><div className="flex gap-2 mb-4"><button onClick={() => updateSlot(index, { base: "ROSSA" })} className={`flex-1 rounded-xl p-2 text-xs font-bold border ${slot.base === "ROSSA" ? "border-terracotta bg-terracotta/10" : "border-charcoal/10"}`}>Base rossa<br /><small>da {formatCurrency(PIZZA_BUILDER_CONFIG.bases.ROSSA.prices[format][gusti - 1])}</small></button><button onClick={() => updateSlot(index, { base: "BIANCA", mozzarellaStandard: false })} className={`flex-1 rounded-xl p-2 text-xs font-bold border ${slot.base === "BIANCA" ? "border-terracotta bg-terracotta/10" : "border-charcoal/10"}`}>Base bianca<br /><small>da {formatCurrency(PIZZA_BUILDER_CONFIG.bases.BIANCA.prices[format][gusti - 1])}</small></button></div>{slot.base === "ROSSA" && <label className="flex items-center gap-2 text-xs font-bold text-charcoal/70 mb-4"><input type="checkbox" checked={Boolean(slot.mozzarellaStandard)} onChange={(e) => updateSlot(index, { mozzarellaStandard: e.target.checked })} /> Completa con mozzarella sulla base rossa <span className="text-terracotta">+{formatCurrency(PIZZA_BUILDER_CONFIG.mozzarellaStandard.prices[format][gusti - 1])}</span></label>}<div className="grid grid-cols-2 gap-1.5">{PIZZA_BUILDER_CONFIG.ingredients.map((row) => { const item = pizzaIngredientData(row[0], format, gusti)!; const checked = slot.ingredients.includes(row[0]); return <button type="button" key={row[0]} onClick={() => toggleIngredient(index, row[0])} className={`rounded-xl p-2 text-left border text-xs ${checked ? "border-terracotta bg-terracotta/10" : "border-charcoal/8 bg-charcoal/[.02]"}`}><span className="block font-bold">{row[0]}</span><span className="text-charcoal/45">+{formatCurrency(item.price)}</span></button>; })}</div></section>)}</div>
        <div className="mt-5 rounded-2xl bg-charcoal/5 p-4"><p className="text-xs font-bold uppercase tracking-widest text-charcoal/45 mb-2">Completa la tua pizza senza costi aggiuntivi</p><div className="flex flex-wrap gap-2">{PIZZA_BUILDER_CONFIG.included.map((name) => <button key={name} onClick={() => toggleIncluded(name)} className={`rounded-full px-3 py-1.5 text-xs border ${included.includes(name) ? "bg-charcoal text-white border-charcoal" : "bg-white border-charcoal/10"}`}>{name}</button>)}</div><p className="text-[11px] text-charcoal/45 mt-2">Scegli liberamente i tuoi condimenti preferiti: il prezzo resta invariato.</p><p className="text-[11px] text-charcoal/45 mt-1">Ingredienti non disponibili per questa configurazione: {PIZZA_BUILDER_CONFIG.excluded.join(", ")}.</p></div>
        <div className="mt-6 flex items-center gap-3"><div className="flex items-center bg-charcoal/5 rounded-full p-1"><button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-9 h-9 text-lg">−</button><span className="w-8 text-center font-bold">{quantity}</span><button onClick={() => setQuantity(quantity + 1)} className="w-9 h-9 text-lg">+</button></div><button onClick={handleAdd} className="flex-1 py-4 text-white rounded-full font-bold uppercase tracking-widest text-xs bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] shadow-xl">Aggiungi · {formatCurrency(calculated.total * quantity)}</button></div>
      </div>
    </div>
  </div>;
}
