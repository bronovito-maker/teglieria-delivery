import {
  PIZZA_BUILDER_CONFIG,
  PIZZA_FORMATS,
  PIZZA_MENU_FLAVORS,
  type PizzaMenuFlavor,
  type PizzaFormat,
  PIZZA_CATALOG,
} from "./catalog";
import { fromCents, toCents } from "./money";

export { PIZZA_BUILDER_CONFIG, PIZZA_FORMATS, PIZZA_MENU_FLAVORS } from "./catalog";
export type { PizzaFormat, PizzaMenuFlavor } from "./catalog";

// Owner-confirmed unavailable ingredients, matching the production gestionale.
// Historical configurations/prices stay readable; only new purchases are blocked.
export const UNAVAILABLE_PIZZA_INGREDIENTS = new Set<string>(["Carciofi"]);
export const AVAILABLE_PIZZA_INGREDIENTS = PIZZA_BUILDER_CONFIG.ingredients.filter(row => !UNAVAILABLE_PIZZA_INGREDIENTS.has(row[0]));

export type PizzaIngredient = { name: string; grams: number; prices: Record<string, number> };

export type MenuPriceBook = Record<PizzaFormat, Record<string, number>>;
// Fallback is for saved/offline previews only. Live screens receive the backend's book.
export const previewMenuPrices: MenuPriceBook = {
 INTERA: Object.fromEntries([...PIZZA_CATALOG.map(p => [p.name, toCents(p.prices.whole)]), ["Pizza Zucca",3900], ["Base rossa",2030],["Base bianca",2600]]),
 MEZZA: Object.fromEntries([...PIZZA_CATALOG.map(p => [p.name, toCents(p.prices.half)]), ["Pizza Zucca",2200], ["Base rossa",1425],["Base bianca",2030]]),
};
export function menuPizzaCents(prices: number[], format: PizzaFormat) {
 if (!prices.length || prices.length > (format === "MEZZA" ? 2 : 4) || prices.some(p => !Number.isSafeInteger(p) || p < 0 || p > 100_000_000)) throw new Error("INVALID_MENU_PRICE");
 const n=prices.length, numerator=prices.reduce((a,b)=>a+b,0)*100+(Math.max(...prices)-Math.min(...prices))*(format==="MEZZA"?20:15)*n;
 return Math.floor((numerator*2+100*n)/(200*n));
}
export function isMenuSelection(value: PizzaBuilderSelection) { return value.mode === "MENU" || (value.mode !== "FREE" && value.slots.every(s=>!!s.flavor)); }
const baseFlavors: PizzaMenuFlavor[] = [{name:"Base rossa",base:"ROSSA" as const,ingredients:[]},{name:"Base bianca",base:"BIANCA" as const,ingredients:[]}];
const pizzaMenuFlavorByName = new Map([...PIZZA_MENU_FLAVORS,...baseFlavors].map((flavor) => [flavor.name, flavor]));

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
  mode?: "MENU" | "FREE";
  format: PizzaFormat;
  gusti: number;
  slots: Array<{
    base: "ROSSA" | "BIANCA";
    flavor?: string;
    mozzarellaStandard?: boolean;
    ingredients: string[];
    removals?: string[];
  }>;
};

export function pizzaRemovableIngredients(slot: PizzaBuilderSelection["slots"][number]): string[] {
  const flavor = getPizzaMenuFlavor(slot.flavor);
  return [...new Set([
    ...(slot.flavor === "Pizza Zucca" ? [] : slot.base === "ROSSA" ? ["Pomodoro"] : ["Fiordilatte"]),
    ...((flavor?.mozzarellaStandard ?? slot.mozzarellaStandard) ? ["Mozzarella standard"] : []),
    ...(flavor?.ingredients ?? []),
  ])];
}

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
  if (candidate.mode !== undefined && candidate.mode !== "MENU" && candidate.mode !== "FREE") throw new Error("INVALID_PIZZA_CONFIGURATION");
  if (candidate.mode === "MENU" && candidate.slots?.some(s=>!s.flavor)) throw new Error("INVALID_PIZZA_CONFIGURATION");
  const formatConfig = PIZZA_BUILDER_CONFIG.formats[candidate.format];
  if (!Number.isInteger(candidate.gusti) || !formatConfig.gusti.includes(candidate.gusti as never)) throw new Error("INVALID_PIZZA_CONFIGURATION");
  if (!Array.isArray(candidate.slots) || candidate.slots.length !== candidate.gusti) throw new Error("INVALID_PIZZA_CONFIGURATION");

  for (const slot of candidate.slots) {
    if (!slot || (slot.base !== "ROSSA" && slot.base !== "BIANCA")) throw new Error("INVALID_PIZZA_CONFIGURATION");
    if (!Array.isArray(slot.ingredients) || slot.ingredients.some((name) => typeof name !== "string" || !pizzaIngredientData(name, candidate.format!, candidate.gusti!))) {
      throw new Error("INVALID_PIZZA_CONFIGURATION");
    }
    if (new Set(slot.ingredients).size !== slot.ingredients.length) throw new Error("INVALID_PIZZA_CONFIGURATION");
    if (slot.removals !== undefined && (!Array.isArray(slot.removals) || slot.removals.some(name => typeof name !== "string" || !pizzaRemovableIngredients(slot).includes(name)) || new Set(slot.removals).size !== slot.removals.length || slot.removals.some(name => slot.ingredients.includes(name)))) throw new Error("INVALID_PIZZA_CONFIGURATION");
    if (slot.mozzarellaStandard !== undefined && typeof slot.mozzarellaStandard !== "boolean") throw new Error("INVALID_PIZZA_CONFIGURATION");
    if (slot.flavor !== undefined) {
      if (typeof slot.flavor !== "string" || !slot.flavor.trim()) throw new Error("INVALID_PIZZA_CONFIGURATION");
      const flavor = getPizzaMenuFlavor(slot.flavor);
      if (!flavor || slot.base !== flavor.base || (slot.mozzarellaStandard !== undefined && slot.mozzarellaStandard !== flavor.mozzarellaStandard)) {
        throw new Error("INVALID_PIZZA_CONFIGURATION");
      }
    }
  }
  if(candidate.slots.some(s=>s.flavor==="Pizza Zucca") && (candidate.mode==="FREE" || candidate.slots.some(s=>!s.flavor))) throw new Error("INVALID_PIZZA_CONFIGURATION");
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

  if (slot.flavor === "Pizza Zucca") return {total: 0, additions: [] as Array<{name:string;price:number;grams?:number;available?:boolean}>};
  const baseType = flavor?.base ?? slot.base;
  const base = pizzaBaseData(baseType, format, gusti);
  const additions: Array<{ name: string; price: number; grams?: number; available?: boolean }> = [];
  let totalCents = toCents(base.price);
  additions.push({ name: `Gusto ${index + 1} · ${flavor?.name ?? base.name}`, price: base.price });

  const mozzarellaStandard = flavor?.mozzarellaStandard ?? (baseType === "ROSSA" && slot.mozzarellaStandard);
  if (mozzarellaStandard && !slot.removals?.includes("Mozzarella standard")) {
    const mozzarella = PIZZA_BUILDER_CONFIG.mozzarellaStandard.prices[format][gusti - 1];
    totalCents += toCents(mozzarella);
    additions.push({ name: `Gusto ${index + 1} · Mozzarella standard`, price: mozzarella, available: true });
  }

  const ingredientNames = [...new Set([...(flavor?.ingredients ?? []), ...slot.ingredients])].filter(name => !slot.removals?.includes(name));
  for (const name of ingredientNames) {
    if (typeof name !== "string" || !pizzaIngredientData(name, format, gusti)) throw new Error("INVALID_PIZZA_CONFIGURATION");
    const ingredient = pizzaIngredientData(name, format, gusti)!;
    totalCents += toCents(ingredient.price);
    additions.push({ name: `Gusto ${index + 1} · ${ingredient.name}`, price: ingredient.price, available: true });
  }

  for (const name of slot.removals ?? []) additions.push({ name: `Gusto ${index + 1} · Senza ${name}`, price: 0 });
  return { total: fromCents(totalCents), additions };
}

export function calculatePizzaConfiguration(selection: PizzaBuilderSelection, book: MenuPriceBook = previewMenuPrices) {
  const validated = parsePizzaBuilderSelection(selection);
  const slotCalculations = validated.slots.map((slot, index) => calculatePizzaSlot(slot, validated.format, validated.gusti, index));
  if (isMenuSelection(validated)) {
    const prices = validated.slots.map(s=>book[validated.format][s.flavor!]);
    const hasZucca=validated.slots.some(s=>s.flavor==="Pizza Zucca");
    const wholePrices=validated.slots.map(s=>book.INTERA[s.flavor!]);
    if(hasZucca && wholePrices.some(p=>!Number.isSafeInteger(p)||p<0||p>100_000_000)) throw new Error("INVALID_MENU_PRICE");
    const baseCents=hasZucca ? Math.round(wholePrices.reduce((a,b)=>a+b,0)/(validated.gusti*(validated.format==="MEZZA"?2:1))) : menuPizzaCents(prices,validated.format);
    const extras=validated.slots.flatMap(s=>s.ingredients.filter(name=>!(getPizzaMenuFlavor(s.flavor)?.ingredients ?? []).includes(name)).map(name=>({name,price:pizzaIngredientData(name,validated.format,validated.gusti)!.price})));
    const divisor=validated.gusti*(validated.format==="MEZZA"?2:1);
    const parts=hasZucca ? wholePrices.map(p=>Math.floor(p/divisor)) : prices.map(()=>Math.floor(baseCents/validated.gusti));
    const remaining=baseCents-parts.reduce((a,b)=>a+b,0);
    const additions=validated.slots.map((slot,i)=>({name:`Gusto ${i+1} · ${slot.flavor}`,price:fromCents(parts[i]+(i<remaining?1:0))}));
    return {total:fromCents(baseCents+extras.reduce((sum,x)=>sum+toCents(x.price),0)),additions:[...additions,...slotCalculations.flatMap(s=>s.additions.filter(a=>!a.name.includes("Senza ") && !a.name.match(/^Gusto \d+ · (La |L'|Base |Capricciosa)/)).map(a=>({...a,price:0}))),...extras,...validated.slots.flatMap((slot,i)=>(slot.removals??[]).map(name=>({name:`Gusto ${i+1} · Senza ${name}`,price:0})))]};
  }
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
    const names = [...(getPizzaMenuFlavor(slot.flavor)?.ingredients ?? []), ...slot.ingredients].filter(name => !slot.removals?.includes(name));
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
