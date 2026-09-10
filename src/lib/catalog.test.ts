import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  assertCanonicalCatalog,
  CATALOG_CATEGORIES,
  CATALOG_EXPECTED_COUNTS,
  CATALOG_PRODUCTS,
  PIZZA_CATALOG,
  PIZZA_FORMATS,
  PIZZA_MENU_FLAVORS,
  SCHIACCIATINA_CATALOG,
} from "./catalog";

describe("canonical catalog", () => {
  const pizzaCategoryKeys = ["whole-pizzas", "half-pizzas", "slices"];

  it("matches the guarded category and product counts", () => {
    expect(() => assertCanonicalCatalog()).not.toThrow();
    expect(CATALOG_CATEGORIES).toHaveLength(CATALOG_EXPECTED_COUNTS.categories);
    expect(CATALOG_PRODUCTS).toHaveLength(CATALOG_EXPECTED_COUNTS.products);
  });

  it("contains one product per pizza and format", () => {
    const pizzaNames = new Set(PIZZA_CATALOG.map((pizza) => pizza.name));
    const pizzaProducts = CATALOG_PRODUCTS.filter(
      (product) => ["whole-pizzas", "half-pizzas", "slices"].includes(product.categoryKey),
    );
    expect(pizzaProducts).toHaveLength(pizzaNames.size * 3);
    expect(new Set(PIZZA_MENU_FLAVORS.map((flavor) => flavor.name))).toEqual(pizzaNames);
  });

  it.each([
    ["La Pistacchio", "Fiordilatte, scamorza affumicata, prosciutto cotto arrosto, crema di burrata, pesto di pistacchio e granella di pistacchio."],
    ["La Parma", "Fiordilatte, prosciutto crudo di Parma DOP, rucola fresca, scaglie di Grana Padano DOP e olio extravergine d'oliva."],
    ["La Carbonara", "Fiordilatte, crema carbonara (Carbo Crema), guanciale croccante e pepe nero."],
  ])("propagates the corrected %s description to all three formats", (name, description) => {
    const products = CATALOG_PRODUCTS.filter(
      (product) => pizzaCategoryKeys.includes(product.categoryKey) && product.name === name,
    );
    expect(products).toHaveLength(3);
    expect(products.find((product) => product.categoryKey === "whole-pizzas")?.description).toBe(description);
    expect(products.find((product) => product.categoryKey === "half-pizzas")?.description).toBe(description);
    expect(products.find((product) => product.categoryKey === "slices")?.description).toBe(`${description} Taglio trancio 1/12.`);
  });

  it.each([
    ["La Regina", "Pomodoro San Marzano DOP, fiordilatte e basilico fresco."],
    ["La Partenopea", "Pomodoro San Marzano DOP, fiordilatte, acciughe e capperi."],
    ["La Contadina", "Pomodoro San Marzano DOP, fiordilatte, prosciutto cotto e funghi."],
    ["La Diavola", "Pomodoro San Marzano DOP, fiordilatte e salamino piccante."],
    ["L'Ortolana", "Pomodoro San Marzano DOP, fiordilatte e verdure di stagione."],
    ["La Nordica", "Fiordilatte, salmone affumicato, burrata pugliese, rucola e pomodorino giallo."],
    ["La Burrata", "Pomodoro San Marzano DOP, burrata pugliese, pomodorini confit, basilico fresco e olio extravergine d'oliva."],
  ])("keeps the approved %s description unchanged in every format", (name, description) => {
    const products = CATALOG_PRODUCTS.filter(
      (product) => pizzaCategoryKeys.includes(product.categoryKey) && product.name === name,
    );
    expect(products).toHaveLength(3);
    for (const product of products) {
      expect(product.description).toBe(
        product.categoryKey === "slices" ? `${description} Taglio trancio 1/12.` : description,
      );
    }
  });

  it("keeps format dimensions and recommendations in one definition", () => {
    expect(PIZZA_FORMATS.INTERA).toMatchObject({ dimensions: "60x40", recommendedPeople: 4, recommendationLabel: "Teglia intera - consigliata per 4 persone" });
    expect(PIZZA_FORMATS.MEZZA).toMatchObject({ dimensions: "30x40", recommendedPeople: 2, recommendationLabel: "Mezza teglia - consigliata per 2 persone" });
  });

  it("contains the official schiacciatina ingredients and deactivates La Cruda", () => {
    expect(SCHIACCIATINA_CATALOG).toEqual([
      expect.objectContaining({ name: "La Semplice", ingredients: ["Base schiacciatina 400 g", "olio EVO", "sale"] }),
      expect.objectContaining({ name: "La Classica", ingredients: ["Base schiacciatina 400 g", "prosciutto cotto", "fiordilatte"] }),
      expect.objectContaining({ name: "La Rustica", ingredients: ["Base schiacciatina 400 g", "salsiccia", "scamorza affumicata", "cipolla"] }),
      expect.objectContaining({ name: "La Cruda", ingredients: null, active: false }),
      expect.objectContaining({ name: "La Pistacchio", ingredients: ["Base schiacciatina 400 g", "prosciutto cotto", "stracciatella", "pesto di pistacchio", "granella di pistacchio"] }),
      expect.objectContaining({ name: "La Parma", ingredients: ["Base schiacciatina 400 g", "prosciutto di Parma DOP", "stracciatella", "rucola", "Grana Padano"] }),
      expect.objectContaining({ name: "La Golosa", ingredients: ["Base schiacciatina 400 g", "Nutella / crema di nocciole"] }),
    ]);
  });

  it("uses the supplied distinct beverage images", () => {
    const valmora = CATALOG_PRODUCTS.find((product) => product.name === "Acqua Valmora naturale");
    const lager = CATALOG_PRODUCTS.find((product) => product.name === "Theresianer Lager");
    const vienna = CATALOG_PRODUCTS.find((product) => product.name === "Theresianer Vienna Rossa");
    expect(valmora?.imageUrl).toBe("/menu/bevanda_acqua_valmora_15l.jpg");
    expect(lager?.imageUrl).toBe("/menu/bevanda_birra_theresianer_lager.webp");
    expect(vienna?.imageUrl).toBe("/menu/bevanda_birra_theresianer_vienna_rossa.jpg");
    expect(lager?.imageUrl).not.toBe(vienna?.imageUrl);
  });

  it("allows a zero base price only for the configurable product", () => {
    const zeroPriceProducts = CATALOG_PRODUCTS.filter((product) => product.price === 0);
    expect(zeroPriceProducts).toHaveLength(1);
    expect(zeroPriceProducts[0]).toMatchObject({ name: "Crea la tua pizza" });
    expect(zeroPriceProducts[0].configuration).toBeDefined();
  });

  it("references local image assets that exist", () => {
    const missing = CATALOG_PRODUCTS
      .filter((product) => product.imageUrl?.startsWith("/menu/"))
      .filter((product) => !existsSync(join(process.cwd(), "public", product.imageUrl!)))
      .map((product) => `${product.categoryKey}:${product.name}`);
    expect(missing).toEqual([]);
  });
});
