import { describe, expect, it } from "vitest";
import { calculateDeliveryFee } from "./constants";

describe("calculateDeliveryFee", () => {
  it("keeps the 2 euro base fee within the first kilometer", () => {
    expect(calculateDeliveryFee(0.8)).toBe(2);
    expect(calculateDeliveryFee(1)).toBe(2);
  });

  it("rounds each extra distance tariff up to the next tenth", () => {
    expect(calculateDeliveryFee(2)).toBe(2.4);
    expect(calculateDeliveryFee(3)).toBe(2.7);
    expect(calculateDeliveryFee(4)).toBe(3);
    expect(calculateDeliveryFee(5)).toBe(3.4);
  });
});
