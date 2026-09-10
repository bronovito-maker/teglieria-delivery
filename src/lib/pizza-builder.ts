import {
  PIZZA_BUILDER_CONFIG,
  PIZZA_FORMATS,
  PIZZA_MENU_FLAVORS,
  type PizzaFormat,
} from "./catalog";

export { PIZZA_BUILDER_CONFIG, PIZZA_FORMATS, PIZZA_MENU_FLAVORS } from "./catalog";
export type { PizzaFormat, PizzaMenuFlavor } from "./catalog";

export type PizzaIngredient = { name: string; grams: number; prices: Record<string, number> };

const pizzaMenuFlavorByName = new Map(PIZZA_MENU_FLAVORS.map((flavor) => [flavor.name, flavor]));

export function getPizzaMenuFlavor(name?: string | null) {
  return name ? pizzaMenuFlavorByName.get(name) ?? null : null;
}

export function pizzaPriceKey(format: PizzaFormat, gusti: number) { return format === "INTERA" ? `I${gusti}` : `M${gusti}`; }
export function pizzaIngredientData(name: string, format: PizzaFormat, gusti: number) {
  const row = PIZZA_BUILDER_CONFIG.ingredients.find((item) => item[0] === name) as readonly [string, number, ...number[]] | undefined;
  if (!row) return null;
  const divisor = format === "INTERA" ? gusti : gusti * 2;
  const key = pizzaPriceKey(format, gusti);
  const price = Number(row[PIZZA_BUILDER_CONFIG.priceKeys.indexOf(key as (typeof PIZZA_BUILDER_CONFIG.priceKeys)[number]) + 2]);
  return { name, grams: Number((row[1] / divisor).toFixed(1)), price: Number(price.toFixed(2)) };
}

export function pizzaBaseData(base: "ROSSA" | "BIANCA", format: PizzaFormat, gusti: number) {
  return { name: PIZZA_BUILDER_CONFIG.bases[base].label, price: PIZZA_BUILDER_CONFIG.bases[base].prices[format][gusti - 1] };
}

export type PizzaBuilderSelection = {
  format: PizzaFormat;
  gusti: number;
  slots: Array<{
    base: "ROSSA" | "BIANCA";
    flavor?: string;
    mozzarellaStandard?: boolean;
    ingredients: string[];
  }>;
};

export function calculatePizzaSlot(
  slot: PizzaBuilderSelection["slots"][number],
  format: PizzaFormat,
  gusti: number,
  index: number,
) {
  if (!slot || !["ROSSA", "BIANCA"].includes(slot.base) || !Array.isArray(slot.ingredients)) {
    throw new Error("INVALID_PIZZA_CONFIGURATION");
  }
  if (slot.flavor !== undefined && slot.flavor !== null && typeof slot.flavor !== "string") {
    throw new Error("INVALID_PIZZA_CONFIGURATION");
  }
  const flavor = getPizzaMenuFlavor(slot.flavor);
  if (slot.flavor && !flavor) throw new Error("INVALID_PIZZA_CONFIGURATION");

  const baseType = flavor?.base ?? slot.base;
  const base = pizzaBaseData(baseType, format, gusti);
  const additions: Array<{ name: string; price: number; grams?: number; available?: boolean }> = [];
  let total = base.price;
  additions.push({ name: `Gusto ${index + 1} · ${flavor?.name ?? base.name}`, price: base.price });

  const mozzarellaStandard = flavor?.mozzarellaStandard ?? (baseType === "ROSSA" && slot.mozzarellaStandard);
  if (mozzarellaStandard) {
    const mozzarella = PIZZA_BUILDER_CONFIG.mozzarellaStandard.prices[format][gusti - 1];
    total += mozzarella;
    additions.push({ name: `Gusto ${index + 1} · Mozzarella standard`, price: mozzarella, available: true });
  }

  const ingredientNames = [...new Set([...(flavor?.ingredients ?? []), ...slot.ingredients])];
  for (const name of ingredientNames) {
    if (typeof name !== "string" || !pizzaIngredientData(name, format, gusti)) throw new Error("INVALID_PIZZA_CONFIGURATION");
    const ingredient = pizzaIngredientData(name, format, gusti)!;
    total += ingredient.price;
    additions.push({ name: `Gusto ${index + 1} · ${ingredient.name}`, price: ingredient.price, available: true });
  }

  return { total: Number(total.toFixed(2)), additions };
}

export function calculatePizzaConfiguration(selection: PizzaBuilderSelection) {
  const format = PIZZA_BUILDER_CONFIG.formats[selection.format];
  if (!format.gusti.includes(selection.gusti as never) || selection.slots.length !== selection.gusti) throw new Error("INVALID_PIZZA_CONFIGURATION");
  const slotCalculations = selection.slots.map((slot, index) => calculatePizzaSlot(slot, selection.format, selection.gusti, index));
  return {
    total: Number(slotCalculations.reduce((sum, slot) => sum + slot.total, 0).toFixed(2)),
    additions: slotCalculations.flatMap((slot) => slot.additions),
  };
}

export function formatPizzaVariant(variant?: string | null) {
  if (!variant) return "";
  try {
    const selection = JSON.parse(variant) as Partial<PizzaBuilderSelection>;
    const format = selection.format === "MEZZA"
      ? PIZZA_FORMATS.MEZZA.displayLabel
      : PIZZA_FORMATS.INTERA.displayLabel;
    const gusti = selection.gusti ?? "?";
    return `${format} · ${gusti} ${gusti === 1 ? "gusto" : "gusti"}`;
  } catch {
    return variant;
  }
}
