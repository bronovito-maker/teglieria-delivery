"use client";

import { useMemo, useState } from "react";
import { useCartStore } from "@/store/cart";
import { formatCurrency } from "@/lib/utils";
import {
  calculatePizzaConfiguration,
  calculatePizzaSlot,
  getPizzaMenuFlavor,
  pizzaIngredientData,
  PIZZA_BUILDER_CONFIG,
  type PizzaBuilderSelection,
  type PizzaFormat,
} from "@/lib/pizza-builder";
import { toast } from "sonner";

export type PizzaMenuFlavorOption = {
  name: string;
  description: string | null;
};

type PizzaBuilderSlot = PizzaBuilderSelection["slots"][number];

function createEmptySlot(): PizzaBuilderSlot {
  return { base: "ROSSA", ingredients: [] };
}

export default function PizzaBuilderModal({
  product,
  onClose,
  menuFlavors,
}: {
  product: { id: string; name: string };
  onClose: () => void;
  menuFlavors: PizzaMenuFlavorOption[];
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [format, setFormat] = useState<PizzaFormat>("INTERA");
  const [gusti, setGusti] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [slots, setSlots] = useState<PizzaBuilderSlot[]>([createEmptySlot()]);

  const selection: PizzaBuilderSelection = { format, gusti, slots };
  const calculated = useMemo(
    () => calculatePizzaConfiguration({ format, gusti, slots }),
    [format, gusti, slots],
  );
  const slotCalculations = useMemo(
    () => slots.map((slot, index) => calculatePizzaSlot(slot, format, gusti, index)),
    [format, gusti, slots],
  );
  const flavorOptions = menuFlavors;

  function setFormatAndGusti(nextFormat: PizzaFormat, nextGusti: number) {
    setFormat(nextFormat);
    setGusti(nextGusti);
    setSlots((current) => Array.from({ length: nextGusti }, (_, index) => current[index] ?? createEmptySlot()));
  }

  function updateSlot(index: number, patch: Partial<PizzaBuilderSlot>) {
    setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot));
  }

  function selectFlavor(index: number, name: string) {
    const flavor = getPizzaMenuFlavor(name);
    if (!flavor) {
      updateSlot(index, { flavor: undefined, base: "ROSSA", mozzarellaStandard: false, ingredients: [] });
      return;
    }
    updateSlot(index, {
      flavor: flavor.name,
      base: flavor.base,
      mozzarellaStandard: flavor.mozzarellaStandard,
      ingredients: [],
    });
  }

  function toggleIngredient(slotIndex: number, name: string) {
    setSlots((current) => current.map((slot, index) => {
      if (index !== slotIndex) return slot;
      return {
        ...slot,
        ingredients: slot.ingredients.includes(name)
          ? slot.ingredients.filter((item) => item !== name)
          : [...slot.ingredients, name],
      };
    }));
  }

  function handleAdd() {
    addItem({
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: 0,
      standardUnitPrice: calculated.total,
      variant: JSON.stringify(selection),
      variantPriceDelta: 0,
      additions: calculated.additions,
      removals: [],
      totalPrice: calculated.total * quantity,
    });
    toast.success("Pizza componibile aggiunta al carrello");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] flex h-[100dvh] items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        className="flex max-h-[100dvh] min-h-0 w-full flex-col overflow-hidden rounded-t-[2.5rem] bg-warm-light shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:max-w-2xl sm:rounded-[2.5rem]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="p-6 pb-8 sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <span className="ds-micro-label text-terracotta/60">Configuratore</span>
              <h2 className="mt-2 font-display text-4xl leading-none tracking-tight text-charcoal">Crea la tua pizza</h2>
              <p className="mt-2 text-sm leading-relaxed text-charcoal/55">
                Per ogni gusto puoi scegliere una pizza già presente nel menu e aggiungere altri ingredienti.
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Chiudi" className="h-10 w-10 shrink-0 rounded-full bg-charcoal/5 text-2xl text-charcoal/50">×</button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            {(["INTERA", "MEZZA"] as PizzaFormat[]).map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setFormatAndGusti(value, 1)}
                className={`rounded-2xl border p-3 text-left ${format === value ? "border-terracotta bg-terracotta/10" : "border-charcoal/10 bg-white"}`}
              >
                <b className="block text-sm">{value === "INTERA" ? "Teglia intera · 60×40 cm" : "Mezza teglia · 30×40 cm"}</b>
                <span className="text-xs text-charcoal/50">Da 1 a {PIZZA_BUILDER_CONFIG.formats[value].gusti.at(-1)} gusti</span>
              </button>
            ))}
          </div>

          <div className="mb-6 flex gap-2">
            {PIZZA_BUILDER_CONFIG.formats[format].gusti.map((value) => (
              <button
                type="button"
                key={value}
                onClick={() => setFormatAndGusti(format, value)}
                className={`flex-1 rounded-full border py-2 text-xs font-bold uppercase ${gusti === value ? "border-terracotta bg-terracotta text-white" : "border-charcoal/10 bg-white text-charcoal/60"}`}
              >
                {value} {value === 1 ? "gusto" : "gusti"}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {slots.map((slot, index) => {
              const flavor = getPizzaMenuFlavor(slot.flavor);
              const includedIngredients = new Set<string>(flavor?.ingredients ?? []);
              const extraIngredients = PIZZA_BUILDER_CONFIG.ingredients.filter((row) => !includedIngredients.has(row[0]));
              const slotCalculation = slotCalculations[index];

              return (
                <section key={index} className="rounded-3xl border border-charcoal/8 bg-white p-4 sm:p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="font-display text-2xl">Gusto {index + 1}</h3>
                    <span className="text-sm font-bold text-terracotta">{formatCurrency(slotCalculation.total)}</span>
                  </div>

                  <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/45" htmlFor={`pizza-flavor-${index}`}>
                    Scegli un gusto dal menu
                  </label>
                  <select
                    id={`pizza-flavor-${index}`}
                    value={slot.flavor ?? ""}
                    onChange={(event) => selectFlavor(index, event.target.value)}
                    className="w-full rounded-2xl border border-charcoal/10 bg-warm-light px-4 py-3 text-sm font-semibold text-charcoal outline-none focus:border-terracotta"
                  >
                    <option value="">Crea il tuo gusto da zero</option>
                    {flavorOptions.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}
                  </select>
                  {flavorOptions.length === 0 && (
                    <p className="mt-2 text-xs italic text-charcoal/45">I gusti del menu non sono disponibili al momento: puoi creare il tuo gusto da zero.</p>
                  )}

                  {flavor ? (
                    <div className="mt-3 rounded-2xl border border-terracotta/15 bg-terracotta/[.05] p-3">
                      <p className="text-sm font-bold text-terracotta">{flavor.name}</p>
                      {flavorOptions.find((option) => option.name === flavor.name)?.description && (
                        <p className="mt-1 text-xs italic leading-relaxed text-charcoal/55">{flavorOptions.find((option) => option.name === flavor.name)?.description}</p>
                      )}
                      <p className="mt-2 text-[11px] text-charcoal/60">
                        Ricetta inclusa: {flavor.ingredients.length > 0 ? flavor.ingredients.join(", ") : "mozzarella e basilico"}.
                      </p>
                      <button type="button" onClick={() => selectFlavor(index, "")} className="mt-2 text-[10px] font-bold uppercase tracking-widest text-terracotta underline underline-offset-2">
                        Personalizza da zero
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 flex gap-2">
                        {(["ROSSA", "BIANCA"] as const).map((base) => (
                          <button
                            type="button"
                            key={base}
                            onClick={() => updateSlot(index, { base, mozzarellaStandard: base === "BIANCA" ? false : slot.mozzarellaStandard })}
                            className={`flex-1 rounded-xl border p-2 text-xs font-bold ${slot.base === base ? "border-terracotta bg-terracotta/10" : "border-charcoal/10"}`}
                          >
                            {base === "ROSSA" ? "Base rossa" : "Base bianca"}
                            <br />
                            <small>da {formatCurrency(PIZZA_BUILDER_CONFIG.bases[base].prices[format][gusti - 1])}</small>
                          </button>
                        ))}
                      </div>
                      {slot.base === "ROSSA" && (
                        <label className="mt-4 flex items-center gap-2 text-xs font-bold text-charcoal/70">
                          <input type="checkbox" checked={Boolean(slot.mozzarellaStandard)} onChange={(event) => updateSlot(index, { mozzarellaStandard: event.target.checked })} />
                          Mozzarella standard <span className="text-terracotta">+{formatCurrency(PIZZA_BUILDER_CONFIG.mozzarellaStandard.prices[format][gusti - 1])}</span>
                        </label>
                      )}
                    </>
                  )}

                  <div className="mt-4 border-t border-charcoal/5 pt-4">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/45">Aggiungi ingredienti extra</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {extraIngredients.map((row) => {
                        const item = pizzaIngredientData(row[0], format, gusti)!;
                        const checked = slot.ingredients.includes(row[0]);
                        return (
                          <button
                            type="button"
                            key={row[0]}
                            onClick={() => toggleIngredient(index, row[0])}
                            className={`rounded-xl border p-2 text-left text-xs ${checked ? "border-terracotta bg-terracotta/10" : "border-charcoal/8 bg-charcoal/[.02]"}`}
                          >
                            <span className="block font-bold">{row[0]}</span>
                            <span className="text-charcoal/45">+{formatCurrency(item.price)}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          </div>
        </div>

        <div className="shrink-0 border-t border-charcoal/8 bg-warm-light px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full bg-charcoal/5 p-1">
              <button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="h-9 w-9 text-lg">−</button>
              <span className="w-8 text-center font-bold">{quantity}</span>
              <button type="button" onClick={() => setQuantity(quantity + 1)} className="h-9 w-9 text-lg">+</button>
            </div>
            <button type="button" onClick={handleAdd} className="flex-1 rounded-full bg-gradient-to-br from-[#E78853] via-[#D96A2B] to-[#B95521] py-4 text-xs font-bold uppercase tracking-widest text-white shadow-xl">
              Aggiungi · {formatCurrency(calculated.total * quantity)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
