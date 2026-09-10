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
} from "./catalog";

describe("canonical catalog", () => {
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

  it("keeps format dimensions and recommendations in one definition", () => {
    expect(PIZZA_FORMATS.INTERA).toMatchObject({ dimensions: "60x40", recommendedPeople: 4 });
    expect(PIZZA_FORMATS.MEZZA).toMatchObject({ dimensions: "30x40", recommendedPeople: 2 });
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
