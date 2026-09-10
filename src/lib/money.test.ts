import { describe, expect, it } from "vitest";
import { calculateAuthoritativeLine, calculateMoneySummary, fromCents, toCents } from "./money";

describe("money", () => {
  it("converte gli importi solo ai confini dell'aritmetica", () => {
    expect(toCents(10.1)).toBe(1010);
    expect(toCents("3.40")).toBe(340);
    expect(fromCents(1350)).toBe(13.5);
  });

  it("non produce mai risparmio negativo", () => {
    expect(calculateMoneySummary([{ quantity: 1, payableUnitPrice: 12, standardUnitPrice: 10 }]).savingsCents).toBe(0);
  });

  it("costruisce una riga autorevole con Club, variante, extra e quantità", () => {
    expect(calculateAuthoritativeLine({
      quantity: 3,
      payableBasePrice: 24,
      standardBasePrice: 32,
      variantPrice: 1.5,
      additionPrices: [0.1, 0.2, 3],
    })).toMatchObject({
      payableUnitCents: 2880,
      standardUnitCents: 3680,
      totalCents: 8640,
    });
  });
});
