import {
  PIZZA_BUILDER_CONFIG,
  PIZZA_FORMATS,
  PIZZA_MENU_FLAVORS,
  type PizzaFormat,
} from "./catalog";
import { fromCents, toCents } from "./money";

export { PIZZA_BUILDER_CONFIG, PIZZA_FORMATS, PIZZA_MENU_FLAVORS } from "./catalog";
export type { PizzaFormat, PizzaMenuFlavor } from "./catalog";

// Owner-confirmed unavailable ingredients, matching the production gestionale.
// Historical configurations/prices stay readable; only new purchases are blocked.
export const UNAVAILABLE_PIZZA_INGREDIENTS = new Set<string>(["Olive nere", "Carciofi"]);
export const AVAILABLE_PIZZA_INGREDIENTS = PIZZA_BUILDER_CONFIG.ingredients.filter(row => !UNAVAILABLE_PIZZA_INGREDIENTS.has(row[0]));

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
  return { name, grams: Number((row[1] / divisor).toFixed(1)), price: fromCents(toCents(price)) };
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

export function parsePizzaBuilderSelection(value: unknown): PizzaBuilderSelection {
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new Error("INVALID_PIZZA_CONFIGURATION");
    }
  }
  if (!parsed || typeof parsed !== "object") throw new Error("INVALID_PIZZA_CONFIGURATION");
  const candidate = parsed as Partial<PizzaBuilderSelection>;
  if (candidate.format !== "INTERA" && candidate.format !== "MEZZA") throw new Error("INVALID_PIZZA_CONFIGURATION");
  const formatConfig = PIZZA_BUILDER_CONFIG.formats[candidate.format];
  if (!Number.isInteger(candidate.gusti) || !formatConfig.gusti.includes(candidate.gusti as never)) throw new Error("INVALID_PIZZA_CONFIGURATION");
  if (!Array.isArray(candidate.slots) || candidate.slots.length !== candidate.gusti) throw new Error("INVALID_PIZZA_CONFIGURATION");

  for (const slot of candidate.slots) {
    if (!slot || (slot.base !== "ROSSA" && slot.base !== "BIANCA")) throw new Error("INVALID_PIZZA_CONFIGURATION");
    if (!Array.isArray(slot.ingredients) || slot.ingredients.some((name) => typeof name !== "string" || !pizzaIngredientData(name, candidate.format!, candidate.gusti!))) {
      throw new Error("INVALID_PIZZA_CONFIGURATION");
    }
    if (new Set(slot.ingredients).size !== slot.ingredients.length) throw new Error("INVALID_PIZZA_CONFIGURATION");
    if (slot.mozzarellaStandard !== undefined && typeof slot.mozzarellaStandard !== "boolean") throw new Error("INVALID_PIZZA_CONFIGURATION");
    if (slot.flavor !== undefined) {
      if (typeof slot.flavor !== "string" || !slot.flavor.trim()) throw new Error("INVALID_PIZZA_CONFIGURATION");
      const flavor = getPizzaMenuFlavor(slot.flavor);
      if (!flavor || slot.base !== flavor.base || (slot.mozzarellaStandard !== undefined && slot.mozzarellaStandard !== flavor.mozzarellaStandard)) {
        throw new Error("INVALID_PIZZA_CONFIGURATION");
      }
    }
  }
  return candidate as PizzaBuilderSelection;
}

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
  let totalCents = toCents(base.price);
  additions.push({ name: `Gusto ${index + 1} · ${flavor?.name ?? base.name}`, price: base.price });

  const mozzarellaStandard = flavor?.mozzarellaStandard ?? (baseType === "ROSSA" && slot.mozzarellaStandard);
  if (mozzarellaStandard) {
    const mozzarella = PIZZA_BUILDER_CONFIG.mozzarellaStandard.prices[format][gusti - 1];
    totalCents += toCents(mozzarella);
    additions.push({ name: `Gusto ${index + 1} · Mozzarella standard`, price: mozzarella, available: true });
  }

  const ingredientNames = [...new Set([...(flavor?.ingredients ?? []), ...slot.ingredients])];
  for (const name of ingredientNames) {
    if (typeof name !== "string" || !pizzaIngredientData(name, format, gusti)) throw new Error("INVALID_PIZZA_CONFIGURATION");
    const ingredient = pizzaIngredientData(name, format, gusti)!;
    totalCents += toCents(ingredient.price);
    additions.push({ name: `Gusto ${index + 1} · ${ingredient.name}`, price: ingredient.price, available: true });
  }

  return { total: fromCents(totalCents), additions };
}

export function calculatePizzaConfiguration(selection: PizzaBuilderSelection) {
  const validated = parsePizzaBuilderSelection(selection);
  const slotCalculations = validated.slots.map((slot, index) => calculatePizzaSlot(slot, validated.format, validated.gusti, index));
  return {
    total: fromCents(slotCalculations.reduce((sum, slot) => sum + toCents(slot.total), 0)),
    additions: slotCalculations.flatMap((slot) => slot.additions),
  };
}

export function calculateAuthoritativePizzaLine(input: {
  selection: PizzaBuilderSelection;
  quantity: number;
  claimedUnitPrice: number;
  claimedTotalPrice: number;
}) {
  if (!Number.isSafeInteger(input.quantity) || input.quantity <= 0) throw new Error("INVALID_PIZZA_PRICE");
  for (const slot of input.selection.slots) {
    const names = [...(getPizzaMenuFlavor(slot.flavor)?.ingredients ?? []), ...slot.ingredients];
    if (names.some(name => UNAVAILABLE_PIZZA_INGREDIENTS.has(name))) throw new Error("PIZZA_INGREDIENT_UNAVAILABLE");
  }
  const calculated = calculatePizzaConfiguration(input.selection);
  const unitPriceCents = toCents(calculated.total);
  const totalPriceCents = unitPriceCents * input.quantity;
  if (toCents(input.claimedUnitPrice) !== unitPriceCents || toCents(input.claimedTotalPrice) !== totalPriceCents) {
    throw new Error("INVALID_PIZZA_PRICE");
  }
  return { calculated, unitPriceCents, totalPriceCents };
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
