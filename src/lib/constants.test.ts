import { describe, expect, it } from "vitest";
import {
  calculateDeliveryFee,
  canTransitionDeliveryStatus,
  canTransitionOrderStatus,
  isOrderTimeAllowed,
} from "./constants";

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

describe("server-side order transitions", () => {
  it("allows only the configured order status transitions", () => {
    expect(canTransitionOrderStatus("DELIVERY", "OUT", "DELIVERED")).toBe(true);
    expect(canTransitionOrderStatus("DELIVERY", "RECEIVED", "DELIVERED")).toBe(false);
    expect(canTransitionOrderStatus("ASPORTO", "READY", "OUT")).toBe(false);
    expect(canTransitionOrderStatus("DELIVERY", "CONFIRMED", "PREPARING")).toBe(true);
  });

  it("allows delivery status progression without skipping from an assigned order", () => {
    expect(canTransitionDeliveryStatus(null, "ASSIGNED")).toBe(true);
    expect(canTransitionDeliveryStatus("ASSIGNED", "EN_ROUTE")).toBe(true);
    expect(canTransitionDeliveryStatus("ASSIGNED", "DELIVERED")).toBe(false);
    expect(canTransitionDeliveryStatus("EN_ROUTE", "DELIVERED")).toBe(true);
  });
});
