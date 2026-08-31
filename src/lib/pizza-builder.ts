export type PizzaFormat = "INTERA" | "MEZZA";
export type PizzaIngredient = { name: string; grams: number; prices: Record<string, number> };

export const PIZZA_BUILDER_CONFIG = {
  version: 1,
  formats: {
    INTERA: { label: "Teglia intera 60x40", gusti: [1, 2, 3, 4], upsell: { 1: 0, 2: 0.1, 3: 0.2, 4: 0.3 } },
    MEZZA: { label: "Mezza teglia 30x40", gusti: [1, 2], upsell: { 1: 0.4, 2: 0.5 } },
  },
  bases: {
    ROSSA: { label: "Base rossa", prices: { INTERA: [20.3, 11.2, 8.15, 6.6], MEZZA: [14.25, 7.65] } },
    BIANCA: { label: "Base bianca", prices: { INTERA: [29, 15.95, 11.6, 9.45], MEZZA: [20.3, 10.9] } },
  },
  mozzarellaStandard: { label: "Mozzarella standard su base rossa", grams: 400, prices: { INTERA: [8.7, 4.8, 3.5, 2.85], MEZZA: [6.1, 3.3] } },
  included: ["Basilico", "Olio EVO", "Sale", "Pepe nero"],
  excluded: ["Tonno", "Nduja", "Crudo nazionale", "Provola", "Edamer", "Salame Napoli"],
  ingredients: [
    ["Pomodoro extra",150,1.3,.75,.55,.45,.95,.5],["Mozzarella extra",150,3.25,1.8,1.3,1.1,2.3,1.25],["Prosciutto cotto",100,2,1.1,.8,.65,1.4,.75],["Funghi",120,.95,.55,.4,.3,.65,.35],["Salamino piccante",100,3,1.65,1.2,1,2.1,1.15],["Verdure di stagione",150,1.75,1,.7,.6,1.25,.7],["Melanzane sotto pesto",150,3,1.65,1.2,1,2.1,1.15],["Acciughe",30,2.35,1.3,.95,.75,1.65,.9],["Capperi",15,.3,.15,.15,.1,.2,.1],["Salsiccia",120,2.5,1.4,1,.85,1.75,.95],["Cipolla",80,.4,.25,.2,.15,.3,.15],["Würstel",125,1.95,1.1,.8,.65,1.4,.75],["Patatine",150,.95,.55,.4,.35,.7,.4],["Speck",90,2.9,1.6,1.2,.95,2.05,1.1],["Scamorza affumicata",80,2.3,1.25,.95,.75,1.6,.85],["Prosciutto di Parma DOP",110,6.05,3.35,2.45,2,4.25,2.3],["Stracciatella",100,3.7,2.05,1.5,1.2,2.6,1.4],["Burrata",200,7.9,4.35,3.15,2.6,5.55,2.95],["Mozzarella di bufala",200,7.7,4.25,3.1,2.5,5.4,2.9],["Guanciale",100,3.1,1.7,1.25,1.05,2.2,1.2],["Pecorino",60,2.8,1.55,1.15,.9,1.95,1.05],["Grana Padano",60,3,1.65,1.2,1,2.1,1.15],["Rucola",30,.8,.45,.35,.3,.6,.3],["Pomodorini",100,2.9,1.6,1.15,.95,2.05,1.1],["Pomodorini confit",100,2.35,1.3,.95,.8,1.65,.9],["Pesto di pistacchio",40,3.75,2.05,1.5,1.25,2.6,1.4],["Granella di pistacchio",20,2,1.1,.8,.65,1.4,.75],["Salmone affumicato",100,9,4.95,3.6,2.95,6.3,3.4],["Gorgonzola",100,3.2,1.75,1.3,1.05,2.25,1.2],["Mascarpone",100,2.8,1.55,1.15,.95,2,1.05],["Mortadella",120,2.75,1.5,1.1,.9,1.95,1.05],["Olive nere",80,.85,.5,.35,.3,.6,.35],["Carciofi",150,1.65,.95,.7,.55,1.2,.65],["Friarielli",150,2.65,1.45,1.1,.9,1.85,1],["Zucchine grigliate",150,4.3,2.35,1.75,1.4,3,1.6],["Peperoni grigliati",150,5.35,2.95,2.15,1.75,3.75,2]],
  priceKeys: ["I1", "I2", "I3", "I4", "M1", "M2"],
} as const;

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

export type PizzaBuilderSelection = { format: PizzaFormat; gusti: number; slots: Array<{ base: "ROSSA" | "BIANCA"; mozzarellaStandard?: boolean; ingredients: string[] }> };

export function calculatePizzaConfiguration(selection: PizzaBuilderSelection) {
  const format = PIZZA_BUILDER_CONFIG.formats[selection.format];
  if (!format.gusti.includes(selection.gusti as never) || selection.slots.length !== selection.gusti) throw new Error("INVALID_PIZZA_CONFIGURATION");
  const additions: Array<{ name: string; price: number; grams?: number; available?: boolean }> = [];
  let total = 0;
  selection.slots.forEach((slot, index) => {
    if (!slot || !["ROSSA", "BIANCA"].includes(slot.base) || !Array.isArray(slot.ingredients)) throw new Error("INVALID_PIZZA_CONFIGURATION");
    const base = pizzaBaseData(slot.base, selection.format, selection.gusti);
    total += base.price;
    additions.push({ name: `Gusto ${index + 1} · ${base.name}`, price: base.price });
    if (slot.base === "ROSSA" && slot.mozzarellaStandard) {
      const mozzarella = PIZZA_BUILDER_CONFIG.mozzarellaStandard.prices[selection.format][selection.gusti - 1];
      total += mozzarella;
      additions.push({ name: `Gusto ${index + 1} · Mozzarella standard`, price: mozzarella, grams: Number((PIZZA_BUILDER_CONFIG.mozzarellaStandard.grams / (selection.format === "INTERA" ? selection.gusti : selection.gusti * 2)).toFixed(1)), available: true });
    }
    for (const name of slot.ingredients) {
      if (typeof name !== "string" || !pizzaIngredientData(name, selection.format, selection.gusti)) throw new Error("INVALID_PIZZA_CONFIGURATION");
      const ingredient = pizzaIngredientData(name, selection.format, selection.gusti)!;
      total += ingredient.price;
      additions.push({ name: `Gusto ${index + 1} · ${ingredient.name}`, price: ingredient.price, grams: ingredient.grams, available: true });
    }
  });
  return { total: Number(total.toFixed(2)), additions };
}

export function formatPizzaVariant(variant?: string | null) {
  if (!variant) return "";
  try {
    const selection = JSON.parse(variant) as Partial<PizzaBuilderSelection>;
    const format = selection.format === "MEZZA" ? "Mezza teglia 30x40" : "Teglia intera 60x40";
    const gusti = selection.gusti ?? "?";
    return `${format} · ${gusti} ${gusti === 1 ? "gusto" : "gusti"}`;
  } catch {
    return variant;
  }
}
