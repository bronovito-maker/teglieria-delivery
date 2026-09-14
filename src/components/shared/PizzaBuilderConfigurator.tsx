"use client";

import AllergenBadges from "@/components/client/AllergenBadges";
import AllergenIngredients from "@/components/client/AllergenIngredients";
import { pizzaAllergens, resolveIngredient, snapshot, type PublicRegistry } from "@/lib/allergens/core";
import {
  calculatePizzaConfiguration,
  calculatePizzaSlot,
  getPizzaMenuFlavor,
  pizzaIngredientData,
  PIZZA_BUILDER_CONFIG,
  type PizzaBuilderSelection,
  type PizzaFormat,
} from "@/lib/pizza-builder";
import { formatCurrency } from "@/lib/utils";
import { useMemo } from "react";

export type PizzaMenuFlavorOption = {
  name: string;
  description: string | null;
};

type PizzaBuilderSlot = PizzaBuilderSelection["slots"][number];

export function createEmptyPizzaSlot(): PizzaBuilderSlot {
  return { base: "ROSSA", ingredients: [] };
}

export function createInitialPizzaSelection(): PizzaBuilderSelection {
  return { format: "INTERA", gusti: 1, slots: [createEmptyPizzaSlot()] };
}

export default function PizzaBuilderConfigurator({
  value,
  onChange,
  menuFlavors,
  allergenRegistry,
}: {
  value: PizzaBuilderSelection;
  onChange: (selection: PizzaBuilderSelection) => void;
  menuFlavors: PizzaMenuFlavorOption[];
  allergenRegistry?: PublicRegistry;
}) {
  const { format, gusti, slots } = value;
  const allergenResult = allergenRegistry ? pizzaAllergens(allergenRegistry.graph, value) : undefined;
  const calculated = useMemo(() => calculatePizzaConfiguration(value), [value]);
  const slotCalculations = useMemo(
    () => slots.map((slot, index) => calculatePizzaSlot(slot, format, gusti, index)),
    [format, gusti, slots],
  );

  function setFormatAndGusti(nextFormat: PizzaFormat, nextGusti: number) {
    onChange({
      format: nextFormat,
      gusti: nextGusti,
      slots: Array.from({ length: nextGusti }, (_, index) => slots[index] ?? createEmptyPizzaSlot()),
    });
  }

  function updateSlot(index: number, patch: Partial<PizzaBuilderSlot>) {
    onChange({
      ...value,
      slots: slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, ...patch } : slot),
    });
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
    const slot = slots[slotIndex];
    updateSlot(slotIndex, {
      ingredients: slot.ingredients.includes(name)
        ? slot.ingredients.filter((item) => item !== name)
        : [...slot.ingredients, name],
    });
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-2" role="group" aria-label="Formato pizza richiesto">
        {(["INTERA", "MEZZA"] as PizzaFormat[]).map((nextFormat) => {
          const option = PIZZA_BUILDER_CONFIG.formats[nextFormat];
          return (
            <button
              type="button"
              key={nextFormat}
              aria-pressed={format === nextFormat}
              onClick={() => setFormatAndGusti(nextFormat, 1)}
              className={`rounded-2xl border p-3 text-left ${format === nextFormat ? "border-terracotta bg-terracotta/10" : "border-charcoal/10 bg-white"}`}
            >
              <b className="block text-sm">{option.label.replace("x", "×")} cm</b>
              <span className="block text-xs text-charcoal/50">{option.recommendationLabel}</span>
              <span className="text-xs text-charcoal/50">Da 1 a {option.gusti.at(-1)} gusti</span>
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex gap-2" role="group" aria-label="Numero di gusti richiesto">
        {PIZZA_BUILDER_CONFIG.formats[format].gusti.map((nextGusti) => (
          <button
            type="button"
            key={nextGusti}
            aria-pressed={gusti === nextGusti}
            onClick={() => setFormatAndGusti(format, nextGusti)}
            className={`flex-1 rounded-full border py-2 text-xs font-bold uppercase ${gusti === nextGusti ? "border-terracotta bg-terracotta text-white" : "border-charcoal/10 bg-white text-charcoal/60"}`}
          >
            {nextGusti} {nextGusti === 1 ? "gusto" : "gusti"}
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
                <div>
                  <h3 className="font-display text-2xl">Gusto {index + 1}</h3>
                  <AllergenBadges info={allergenRegistry && allergenResult ? snapshot(allergenRegistry, allergenResult.containers[index]) : undefined} />
                </div>
                <span className="text-sm font-bold text-terracotta">{formatCurrency(slotCalculation.total)}</span>
              </div>

              <label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/45" htmlFor={`pizza-flavor-${index}`}>
                Gusto o composizione personalizzata
              </label>
              <select
                id={`pizza-flavor-${index}`}
                value={slot.flavor ?? ""}
                onChange={(event) => selectFlavor(index, event.target.value)}
                className="w-full rounded-2xl border border-charcoal/10 bg-warm-light px-4 py-3 text-sm font-semibold text-charcoal outline-none focus:border-terracotta"
              >
                <option value="">Composizione personalizzata</option>
                {menuFlavors.map((option) => <option key={option.name} value={option.name}>{option.name}</option>)}
              </select>

              {flavor ? (
                <div className="mt-3 rounded-2xl border border-terracotta/15 bg-terracotta/[.05] p-3">
                  <p className="text-sm font-bold text-terracotta">{flavor.name}</p>
                  <AllergenIngredients registry={allergenRegistry} recipeId={allergenRegistry?.graph.flavors[flavor.name]} />
                  {menuFlavors.find((option) => option.name === flavor.name)?.description && (
                    <p className="mt-1 text-xs italic leading-relaxed text-charcoal/55">{menuFlavors.find((option) => option.name === flavor.name)?.description}</p>
                  )}
                  <p className="mt-2 text-[11px] text-charcoal/60">Ricetta inclusa: {flavor.ingredients.length > 0 ? flavor.ingredients.join(", ") : "mozzarella e basilico"}.</p>
                  <button type="button" onClick={() => selectFlavor(index, "")} className="mt-2 text-[10px] font-bold uppercase tracking-widest text-terracotta underline underline-offset-2">Personalizza da zero</button>
                </div>
              ) : (
                <>
                  <div className="mt-4 flex gap-2" role="group" aria-label={`Base richiesta per il gusto ${index + 1}`}>
                    {(["ROSSA", "BIANCA"] as const).map((base) => (
                      <button
                        type="button"
                        key={base}
                        aria-pressed={slot.base === base}
                        onClick={() => updateSlot(index, { base, mozzarellaStandard: base === "BIANCA" ? false : slot.mozzarellaStandard })}
                        className={`flex-1 rounded-xl border p-2 text-xs font-bold ${slot.base === base ? "border-terracotta bg-terracotta/10" : "border-charcoal/10"}`}
                      >
                        {base === "ROSSA" ? "Base rossa" : "Base bianca"}<br />
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
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-charcoal/45">Ingredienti extra</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {extraIngredients.map((row) => {
                    const item = pizzaIngredientData(row[0], format, gusti)!;
                    const checked = slot.ingredients.includes(row[0]);
                    return (
                      <button
                        type="button"
                        key={row[0]}
                        aria-pressed={checked}
                        onClick={() => toggleIngredient(index, row[0])}
                        className={`rounded-xl border p-2 text-left text-xs ${checked ? "border-terracotta bg-terracotta/10" : "border-charcoal/8 bg-charcoal/[.02]"}`}
                      >
                        <span className="block font-bold">{row[0]}</span>
                        <AllergenBadges interactive={false} info={allergenRegistry ? snapshot(allergenRegistry, resolveIngredient(allergenRegistry.graph, row[0])) : undefined} />
                        <span className="mt-1 block text-charcoal/60">+{formatCurrency(item.price)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <p className="mt-4 text-right text-sm font-bold text-charcoal">Totale unitario: {formatCurrency(calculated.total)}</p>
      <div className="mt-2" aria-live="polite"><span className="text-xs font-bold">Allergeni della pizza: </span><AllergenBadges info={allergenRegistry && allergenResult ? snapshot(allergenRegistry, allergenResult) : undefined} /></div>
    </div>
  );
}
