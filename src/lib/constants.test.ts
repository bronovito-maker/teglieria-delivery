import { describe, expect, it } from "vitest";
import { calculateDeliveryFee, isOrderTimeAllowed } from "./constants";

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

describe("order service hours", () => {
  it("allows pickup from 16:00", () => {
    expect(isOrderTimeAllowed("ASPORTO", "15:30")).toBe(false);
    expect(isOrderTimeAllowed("ASPORTO", "16:00")).toBe(true);
  });

  it("allows delivery only from 19:00 until 22:00", () => {
    expect(isOrderTimeAllowed("DELIVERY", "18:30")).toBe(false);
    expect(isOrderTimeAllowed("DELIVERY", "19:00")).toBe(true);
    expect(isOrderTimeAllowed("DELIVERY", "21:30")).toBe(true);
    expect(isOrderTimeAllowed("DELIVERY", "22:00")).toBe(false);
  });
});
