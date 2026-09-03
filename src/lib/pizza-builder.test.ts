import { describe, expect, it } from "vitest";
import { calculatePizzaConfiguration } from "./pizza-builder";

describe("calculatePizzaConfiguration", () => {
  it("usa la ricetta di un gusto presente nel menu", () => {
    const result = calculatePizzaConfiguration({
      format: "INTERA",
      gusti: 1,
      slots: [{ base: "ROSSA", flavor: "La Diavola", ingredients: [] }],
    });

    expect(result.total).toBe(32);
    expect(result.additions.map((addition) => addition.name)).toEqual([
      "Gusto 1 · La Diavola",
      "Gusto 1 · Mozzarella standard",
      "Gusto 1 · Salamino piccante",
    ]);
  });

  it("somma gli ingredienti extra senza duplicare quelli già nella ricetta", () => {
    const result = calculatePizzaConfiguration({
      format: "MEZZA",
      gusti: 1,
      slots: [{ base: "ROSSA", flavor: "La Diavola", ingredients: ["Salamino piccante", "Funghi"] }],
    });

    expect(result.additions.filter((addition) => addition.name.includes("Salamino piccante"))).toHaveLength(1);
    expect(result.additions.some((addition) => addition.name.includes("Funghi"))).toBe(true);
  });

  it("rifiuta un gusto che non appartiene al catalogo autorizzato", () => {
    expect(() => calculatePizzaConfiguration({
      format: "INTERA",
      gusti: 1,
      slots: [{ base: "ROSSA", flavor: "Gusto inventato", ingredients: [] }],
    })).toThrow("INVALID_PIZZA_CONFIGURATION");
  });
});
