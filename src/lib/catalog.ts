export type PizzaFormat = "INTERA" | "MEZZA";

export const PIZZA_FORMATS = {
  INTERA: {
    label: "Teglia intera",
    dimensions: "60x40",
    displayLabel: "Teglia intera 60x40",
    recommendedPeople: 4,
    recommendationLabel: "Teglia intera - consigliata per 4 persone",
    categoryKey: "whole-pizzas",
    categoryName: "Teglie",
    gusti: [1, 2, 3, 4],
  },
  MEZZA: {
    label: "Mezza teglia",
    dimensions: "30x40",
    displayLabel: "Mezza teglia 30x40",
    recommendedPeople: 2,
    recommendationLabel: "Mezza teglia - consigliata per 2 persone",
    categoryKey: "half-pizzas",
    categoryName: "Mezze teglie",
    gusti: [1, 2],
  },
} as const;

export const PIZZA_BUILDER_CONFIG = {
  version: 1,
  formats: {
    INTERA: {
      label: PIZZA_FORMATS.INTERA.displayLabel,
      dimensions: PIZZA_FORMATS.INTERA.dimensions,
      recommendedPeople: PIZZA_FORMATS.INTERA.recommendedPeople,
      recommendationLabel: PIZZA_FORMATS.INTERA.recommendationLabel,
      gusti: PIZZA_FORMATS.INTERA.gusti,
      upsell: { 1: 0, 2: 0.1, 3: 0.2, 4: 0.3 },
    },
    MEZZA: {
      label: PIZZA_FORMATS.MEZZA.displayLabel,
      dimensions: PIZZA_FORMATS.MEZZA.dimensions,
      recommendedPeople: PIZZA_FORMATS.MEZZA.recommendedPeople,
      recommendationLabel: PIZZA_FORMATS.MEZZA.recommendationLabel,
      gusti: PIZZA_FORMATS.MEZZA.gusti,
      upsell: { 1: 0.4, 2: 0.5 },
    },
  },
  bases: {
    ROSSA: { label: "Base rossa", prices: { INTERA: [20.3, 11.2, 8.15, 6.6], MEZZA: [14.25, 7.65] } },
    BIANCA: { label: "Base bianca", prices: { INTERA: [29, 15.95, 11.6, 9.45], MEZZA: [20.3, 10.9] } },
  },
  mozzarellaStandard: {
    label: "Mozzarella standard su base rossa",
    grams: 400,
    prices: { INTERA: [8.7, 4.8, 3.5, 2.85], MEZZA: [6.1, 3.3] },
  },
  ingredients: [
    ["Pomodoro extra",150,1.3,.75,.55,.45,.95,.5],["Mozzarella extra",150,3.25,1.8,1.3,1.1,2.3,1.25],["Prosciutto cotto",100,2,1.1,.8,.65,1.4,.75],["Funghi",120,.95,.55,.4,.3,.65,.35],["Salamino piccante",100,3,1.65,1.2,1,2.1,1.15],["Verdure di stagione",150,1.75,1,.7,.6,1.25,.7],["Melanzane sotto pesto",150,3,1.65,1.2,1,2.1,1.15],["Acciughe",30,2.35,1.3,.95,.75,1.65,.9],["Capperi",15,.3,.15,.15,.1,.2,.1],["Salsiccia",120,2.5,1.4,1,.85,1.75,.95],["Cipolla",80,.4,.25,.2,.15,.3,.15],["Würstel",125,1.95,1.1,.8,.65,1.4,.75],["Patatine",150,.95,.55,.4,.35,.7,.4],["Speck",90,2.9,1.6,1.2,.95,2.05,1.1],["Scamorza affumicata",80,2.3,1.25,.95,.75,1.6,.85],["Prosciutto di Parma DOP",110,6.05,3.35,2.45,2,4.25,2.3],["Stracciatella",100,3.7,2.05,1.5,1.2,2.6,1.4],["Burrata",200,7.9,4.35,3.15,2.6,5.55,2.95],["Mozzarella di bufala",200,7.7,4.25,3.1,2.5,5.4,2.9],["Guanciale",100,3.1,1.7,1.25,1.05,2.2,1.2],["Pecorino",60,2.8,1.55,1.15,.9,1.95,1.05],["Grana Padano",60,3,1.65,1.2,1,2.1,1.15],["Rucola",30,.8,.45,.35,.3,.6,.3],["Pomodorini",100,2.9,1.6,1.15,.95,2.05,1.1],["Pomodorini confit",100,2.35,1.3,.95,.8,1.65,.9],["Pesto di pistacchio",40,3.75,2.05,1.5,1.25,2.6,1.4],["Granella di pistacchio",20,2,1.1,.8,.65,1.4,.75],["Salmone affumicato",100,9,4.95,3.6,2.95,6.3,3.4],["Gorgonzola",100,3.2,1.75,1.3,1.05,2.25,1.2],["Mascarpone",100,2.8,1.55,1.15,.95,2,1.05],["Mortadella",120,2.75,1.5,1.1,.9,1.95,1.05],["Olive nere",80,.85,.5,.35,.3,.6,.35],["Carciofi",150,1.65,.95,.7,.55,1.2,.65],["Friarielli",150,2.65,1.45,1.1,.9,1.85,1],["Zucchine grigliate",150,4.3,2.35,1.75,1.4,3,1.6],["Peperoni grigliati",150,5.35,2.95,2.15,1.75,3.75,2],
  ],
  priceKeys: ["I1", "I2", "I3", "I4", "M1", "M2"],
} as const;

export type PizzaMenuFlavor = {
  name: string;
  base: "ROSSA" | "BIANCA";
  mozzarellaStandard?: boolean;
  ingredients: readonly string[];
};

type PizzaCatalogDefinition = {
  name: string;
  description: string;
  prices: {
    whole: number;
    wholeClub: number;
    wholePromo: number;
    half: number;
    halfClub: number;
    halfPromo: number;
    slice: number;
  };
  images: { pizza: string; slice: string };
  recipe: Omit<PizzaMenuFlavor, "name">;
};

export const PIZZA_CATALOG: readonly PizzaCatalogDefinition[] = [
  { name: "La Regina", description: "Pomodoro San Marzano DOP, fiordilatte e basilico fresco.", prices: { whole: 29, wholeClub: 24, wholePromo: 19, half: 16, halfClub: 14, halfPromo: 12, slice: 3 }, images: { pizza: "/menu/pizza_laregina.jpg", slice: "/menu/tranci/regina.webp" }, recipe: { base: "ROSSA", mozzarellaStandard: true, ingredients: [] } },
  { name: "La Partenopea", description: "Pomodoro San Marzano DOP, fiordilatte, acciughe e capperi.", prices: { whole: 34, wholeClub: 29, wholePromo: 24, half: 19, halfClub: 17, halfPromo: 15, slice: 3.5 }, images: { pizza: "/menu/pizza_lapartenopea.jpg", slice: "/menu/tranci/partenopea.webp" }, recipe: { base: "ROSSA", mozzarellaStandard: true, ingredients: ["Acciughe", "Capperi"] } },
  { name: "La Contadina", description: "Pomodoro San Marzano DOP, fiordilatte, prosciutto cotto e funghi.", prices: { whole: 36, wholeClub: 30, wholePromo: 25, half: 20, halfClub: 18, halfPromo: 16, slice: 3.5 }, images: { pizza: "/menu/pizza_lacontadina.jpg", slice: "/menu/tranci/contadina.webp" }, recipe: { base: "ROSSA", mozzarellaStandard: true, ingredients: ["Prosciutto cotto", "Funghi"] } },
  { name: "La Diavola", description: "Pomodoro San Marzano DOP, fiordilatte e salamino piccante.", prices: { whole: 34, wholeClub: 29, wholePromo: 24, half: 19, halfClub: 17, halfPromo: 15, slice: 3.5 }, images: { pizza: "/menu/pizza_ladiavola.jpg", slice: "/menu/tranci/diavola.webp" }, recipe: { base: "ROSSA", mozzarellaStandard: true, ingredients: ["Salamino piccante"] } },
  { name: "L'Ortolana", description: "Pomodoro San Marzano DOP, fiordilatte e verdure di stagione.", prices: { whole: 34, wholeClub: 28, wholePromo: 23, half: 19, halfClub: 16, halfPromo: 15, slice: 3.5 }, images: { pizza: "/menu/pizza_lortolana.jpg", slice: "/menu/tranci/ortolana.webp" }, recipe: { base: "ROSSA", mozzarellaStandard: true, ingredients: ["Verdure di stagione"] } },
  { name: "La Pistacchio", description: "Fiordilatte, scamorza affumicata, prosciutto cotto arrosto, crema di burrata, pesto di pistacchio e granella di pistacchio.", prices: { whole: 45, wholeClub: 42, wholePromo: 37, half: 25, halfClub: 25, halfPromo: 23, slice: 4.5 }, images: { pizza: "/menu/pizza_lapistacchio.jpg", slice: "/menu/tranci/pistacchio.webp" }, recipe: { base: "BIANCA", ingredients: ["Scamorza affumicata", "Prosciutto cotto", "Burrata", "Pesto di pistacchio", "Granella di pistacchio"] } },
  { name: "La Nordica", description: "Fiordilatte, salmone affumicato, burrata pugliese, rucola e pomodorino giallo.", prices: { whole: 49, wholeClub: 45, wholePromo: 40, half: 27, halfClub: 27, halfPromo: 25, slice: 5 }, images: { pizza: "/menu/pizza_lanordica.jpg", slice: "/menu/tranci/nordica.webp" }, recipe: { base: "BIANCA", ingredients: ["Salmone affumicato", "Burrata", "Rucola", "Pomodorini"] } },
  { name: "La Parma", description: "Fiordilatte, prosciutto crudo di Parma DOP, rucola fresca, scaglie di Grana Padano DOP e olio extravergine d'oliva.", prices: { whole: 44, wholeClub: 39, wholePromo: 34, half: 24, halfClub: 23, halfPromo: 21, slice: 4.5 }, images: { pizza: "/menu/pizza_laparma.jpg", slice: "/menu/tranci/parma.webp" }, recipe: { base: "BIANCA", ingredients: ["Prosciutto di Parma DOP", "Rucola", "Grana Padano"] } },
  { name: "La Burrata", description: "Pomodoro San Marzano DOP, burrata pugliese, pomodorini confit, basilico fresco e olio extravergine d'oliva.", prices: { whole: 42, wholeClub: 39, wholePromo: 33, half: 23, halfClub: 23, halfPromo: 21, slice: 4.5 }, images: { pizza: "/menu/pizza_teglia_la_burrata.jpg", slice: "/menu/tranci/burrata.webp" }, recipe: { base: "ROSSA", mozzarellaStandard: true, ingredients: ["Burrata", "Pomodorini confit"] } },
  { name: "La Carbonara", description: "Fiordilatte, crema carbonara (Carbo Crema), guanciale croccante e pepe nero.", prices: { whole: 42, wholeClub: 36, wholePromo: 31, half: 23, halfClub: 21, halfPromo: 19, slice: 4.5 }, images: { pizza: "/menu/pizza_lacarbonara.jpg", slice: "/menu/tranci/carbonara.webp" }, recipe: { base: "BIANCA", ingredients: ["Pecorino", "Guanciale"] } },
];

export const PIZZA_MENU_FLAVORS: readonly PizzaMenuFlavor[] = PIZZA_CATALOG.map(
  ({ name, recipe }) => ({ name, ...recipe }),
);

export type CatalogCategoryKey =
  | "custom-pizza"
  | "whole-pizzas"
  | "half-pizzas"
  | "slices"
  | "schiacciatine"
  | "ceci"
  | "fried"
  | "soft-drinks"
  | "beers";

export const CATALOG_CATEGORIES: readonly {
  key: CatalogCategoryKey;
  name: string;
  sortOrder: number;
}[] = [
  { key: "custom-pizza", name: "Crea la tua pizza", sortOrder: 0 },
  { key: "whole-pizzas", name: PIZZA_FORMATS.INTERA.categoryName, sortOrder: 1 },
  { key: "half-pizzas", name: PIZZA_FORMATS.MEZZA.categoryName, sortOrder: 2 },
  { key: "slices", name: "Tranci", sortOrder: 3 },
  { key: "schiacciatine", name: "Schiacciatine", sortOrder: 4 },
  { key: "ceci", name: "Torta di ceci e 5e5", sortOrder: 5 },
  { key: "fried", name: "Fritti", sortOrder: 6 },
  { key: "soft-drinks", name: "Bevande analcoliche", sortOrder: 7 },
  { key: "beers", name: "Birre", sortOrder: 8 },
];

export type CatalogProductDefinition = {
  categoryKey: CatalogCategoryKey;
  name: string;
  description: string;
  price: number;
  clubPrice?: number;
  promoPrice?: number;
  imageUrl: string | null;
  sortOrder: number;
  configuration?: unknown;
  recipe: PizzaMenuFlavor["ingredients"] | null;
  ingredients?: readonly string[] | null;
  active?: boolean;
};

export type SchiacciatinaCatalogProduct = {
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  ingredients: readonly string[] | null;
  active?: boolean;
};

export const SCHIACCIATINA_CATALOG: readonly SchiacciatinaCatalogProduct[] = [
  { name: "La Semplice", description: "Base intera da 400 g", price: 2.5, imageUrl: null, ingredients: ["Base schiacciatina 400 g", "olio EVO", "sale"] },
  { name: "La Classica", description: "Base intera da 400 g", price: 8, imageUrl: null, ingredients: ["Base schiacciatina 400 g", "prosciutto cotto", "fiordilatte"] },
  { name: "La Rustica", description: "Base intera da 400 g", price: 10, imageUrl: null, ingredients: ["Base schiacciatina 400 g", "salsiccia", "scamorza affumicata", "cipolla"] },
  { name: "La Cruda", description: "Base intera da 400 g", price: 10.5, imageUrl: null, ingredients: null, active: false },
  { name: "La Pistacchio", description: "Base intera da 400 g", price: 12, imageUrl: "/menu/pizza_teglia_la_pistacchio.jpg", ingredients: ["Base schiacciatina 400 g", "prosciutto cotto", "stracciatella", "pesto di pistacchio", "granella di pistacchio"] },
  { name: "La Parma", description: "Base intera da 400 g", price: 12.5, imageUrl: "/menu/pizza_teglia_la_parma_closeup.jpg", ingredients: ["Base schiacciatina 400 g", "prosciutto di Parma DOP", "stracciatella", "rucola", "Grana Padano"] },
  { name: "La Golosa", description: "Base intera da 400 g", price: 7, imageUrl: null, ingredients: ["Base schiacciatina 400 g", "Nutella / crema di nocciole"] },
] as const;

const ceci = [
  ["Torta di Ceci", "Vendita a peso - € 1,90 / 100 g", 1.9, "/menu/torta_di_ceci_dettaglio.jpg"],
  ["Giga 5e5", "Base intera da 400 g", 4, "/menu/5e5_closeup.jpg"],
  ["Giga 5e5 con Melanzane", "Base intera da 400 g", 5.5, "/menu/5e5_melanzane.jpg"],
  ["5e5 Piccolo", "Mezza base", 2.5, "/menu/5e5_closeup.jpg"],
  ["5e5 Piccolo con Melanzane", "Mezza base", 3.5, "/menu/5e5_melanzane.jpg"],
] as const;

const fried = [
  ["Pane Fritto della Teglieria", "8 pezzi", 4],
  ["Patatine Fritte", "220 g", 4],
  ["Nuggets di Pollo", "4 pezzi", 4],
  ["Anelli di Cipolla", "5 pezzi", 4],
] as const;

const softDrinks = [
  ["Acqua naturale S. Antonio", "50 cl", 1, "/menu/bevanda_acqua_naturale.jpg"],
  ["Acqua gassata S. Antonio", "50 cl", 1, "/menu/bevanda_acqua_frizzante.jpg"],
  ["Acqua Valmora naturale", "1,5 L", 1.5, "/menu/bevanda_acqua_valmora_15l.jpg"],
  ["Estathé pesca o limone - brick", "20 cl", 1.2, "/menu/bevanda_estate_pesca_brick.jpg"],
  ["Coca-Cola, Coca-Cola Zero o Fanta - lattina", "33 cl", 2.3, "/menu/bevanda_coca_cola_lattina.jpg"],
  ["Coca-Cola, Coca-Cola Zero o Fanta Lemon - PET", "45 cl", 3.5, "/menu/bevanda_coca_cola_bottiglia.jpg"],
  ["Estathé pesca o limone - PET", "40 cl", 3, "/menu/bevanda_estate_pesca_bottiglia.jpg"],
  ["Spuma bionda Queen", "33 cl", 4.5, "/menu/bevanda_spuma_bionda.jpg"],
] as const;

const beers = [
  ["Bitburger Drive analcolica", "33 cl", 3, "/menu/bevanda_birra_analcolica_bitburger.jpg"],
  ["Bitburger Pils", "50 cl", 3.5, "/menu/bevanda_birra_bitburger.jpg"],
  ["Corona Extra", "33 cl", 4, "/menu/bevanda_birra_corona_extra.jpg"],
  ["Theresianer Lager", "33 cl", 4, "/menu/bevanda_birra_theresianer_lager.webp"],
  ["Theresianer Vienna Rossa", "33 cl", 4.5, "/menu/bevanda_birra_theresianer_vienna_rossa.jpg"],
  ["Ichnusa Non Filtrata", "50 cl", 5, "/menu/bevanda_birra_ichnusa_non_filtrata.jpg"],
  ["Lauterbacher Weizen", "50 cl", 4.5, "/menu/bevanda_birra_lauterbacher.jpg"],
  ["BrewDog Punk IPA", "33 cl", 5.5, "/menu/bevanda_birra_brewdog_punk_ipa.jpg"],
] as const;

const pizzaProducts: CatalogProductDefinition[] = PIZZA_CATALOG.flatMap((pizza, sortOrder) => [
  { categoryKey: "whole-pizzas", name: pizza.name, description: pizza.description, price: pizza.prices.whole, clubPrice: pizza.prices.wholeClub, promoPrice: pizza.prices.wholePromo, imageUrl: pizza.images.pizza, sortOrder, recipe: pizza.recipe.ingredients },
  { categoryKey: "half-pizzas", name: pizza.name, description: pizza.description, price: pizza.prices.half, clubPrice: pizza.prices.halfClub, promoPrice: pizza.prices.halfPromo, imageUrl: pizza.images.pizza, sortOrder, recipe: pizza.recipe.ingredients },
  { categoryKey: "slices", name: pizza.name, description: `${pizza.description} Taglio trancio 1/12.`, price: pizza.prices.slice, imageUrl: pizza.images.slice, sortOrder, recipe: pizza.recipe.ingredients },
]);

export const CATALOG_PRODUCTS: readonly CatalogProductDefinition[] = [
  {
    categoryKey: "custom-pizza",
    name: "Crea la tua pizza",
    description: "Componi ogni gusto scegliendo base e ingredienti. Mezza teglia 30x40 o teglia intera 60x40.",
    price: 0,
    imageUrl: "/menu/pizza-componi.webp",
    sortOrder: 0,
    configuration: PIZZA_BUILDER_CONFIG,
    recipe: null,
  },
  ...pizzaProducts,
  ...SCHIACCIATINA_CATALOG.map<CatalogProductDefinition>((product, sortOrder) => ({
    categoryKey: "schiacciatine",
    ...product,
    imageUrl: product.imageUrl ?? "/menu/placeholder-food.svg",
    sortOrder,
    recipe: null,
  })),
  ...ceci.map<CatalogProductDefinition>(([name, description, price, imageUrl], sortOrder) => ({ categoryKey: "ceci", name, description, price, imageUrl, sortOrder, recipe: null })),
  ...fried.map<CatalogProductDefinition>(([name, description, price], sortOrder) => ({ categoryKey: "fried", name, description, price, imageUrl: "/menu/placeholder-food.svg", sortOrder, recipe: null })),
  ...softDrinks.map<CatalogProductDefinition>(([name, description, price, imageUrl], sortOrder) => ({ categoryKey: "soft-drinks", name, description, price, imageUrl, sortOrder, recipe: null })),
  ...beers.map<CatalogProductDefinition>(([name, description, price, imageUrl], sortOrder) => ({ categoryKey: "beers", name, description, price, imageUrl, sortOrder, recipe: null })),
];

export const CATALOG_EXPECTED_COUNTS = {
  categories: 9,
  products: 63,
} as const;

export function getPizzaFormatByCategory(categoryName: string) {
  return Object.values(PIZZA_FORMATS).find((format) => format.categoryName === categoryName) ?? null;
}

const CATEGORY_KEY_BY_NAME = new Map(CATALOG_CATEGORIES.map((category) => [category.name, category.key]));
const PRODUCT_BY_KEY = new Map(CATALOG_PRODUCTS.map((product) => [`${product.categoryKey}:${product.name}`, product]));

export function getCanonicalProduct(categoryName: string, productName: string) {
  const categoryKey = CATEGORY_KEY_BY_NAME.get(categoryName);
  return categoryKey ? PRODUCT_BY_KEY.get(`${categoryKey}:${productName}`) ?? null : null;
}

export function getCanonicalProductIngredients(categoryName: string, productName: string): string[] | null {
  const ingredients = getCanonicalProduct(categoryName, productName)?.ingredients;
  return ingredients ? [...ingredients] : null;
}

export function assertCanonicalCatalog(
  expected: { categories: number; products: number } = CATALOG_EXPECTED_COUNTS,
): void {
  if (CATALOG_CATEGORIES.length !== expected.categories) {
    throw new Error(`CATALOG_CATEGORY_COUNT_MISMATCH:${CATALOG_CATEGORIES.length}:${expected.categories}`);
  }
  if (CATALOG_PRODUCTS.length !== expected.products) {
    throw new Error(`CATALOG_PRODUCT_COUNT_MISMATCH:${CATALOG_PRODUCTS.length}:${expected.products}`);
  }

  const categoryKeys = new Set(CATALOG_CATEGORIES.map((category) => category.key));
  const categoryNames = new Set(CATALOG_CATEGORIES.map((category) => category.name));
  if (categoryKeys.size !== CATALOG_CATEGORIES.length || categoryNames.size !== CATALOG_CATEGORIES.length) {
    throw new Error("DUPLICATE_CANONICAL_CATEGORY");
  }

  const productKeys = new Set<string>();
  for (const product of CATALOG_PRODUCTS) {
    if (!categoryKeys.has(product.categoryKey)) throw new Error(`UNKNOWN_CANONICAL_CATEGORY:${product.categoryKey}`);
    if (!Number.isFinite(product.price) || product.price < 0) throw new Error(`INVALID_CANONICAL_PRICE:${product.name}`);
    const key = `${product.categoryKey}:${product.name}`;
    if (productKeys.has(key)) throw new Error(`DUPLICATE_CANONICAL_PRODUCT:${key}`);
    productKeys.add(key);
  }
}
