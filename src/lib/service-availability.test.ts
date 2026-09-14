import { describe, expect, it } from "vitest";
import { getServiceAvailability, serviceForOrderType } from "./service-availability";

describe("service availability", () => {
  const now = new Date("2026-09-14T18:00:00.000Z");

  it("keeps delivery and pickup independent", () => {
    const state = getServiceAvailability({ deliveryEnabled: false, pickupEnabled: true }, now);
    expect(state.delivery.active).toBe(false);
    expect(state.delivery.label).toBe("Il Delivery torna presto");
    expect(state.pickup.active).toBe(true);
    expect(state.allDisabled).toBe(false);
  });

  it("shows the automatic Delivery reactivation date", () => {
    const state = getServiceAvailability({ deliveryEnabled: false, deliveryDisabledUntil: "2026-09-14T20:00:00.000Z" }, now);
    expect(state.delivery.label).toMatch(/^Il Delivery torna disponibile /);
  });

  it("automatically reactivates an expired suspension", () => {
    const state = getServiceAvailability({ deliveryEnabled: false, deliveryDisabledUntil: "2026-09-14T17:59:00.000Z" }, now);
    expect(state.delivery.active).toBe(true);
  });

  it("supports an indefinite suspension", () => {
    const state = getServiceAvailability({ pickupEnabled: false, pickupDisabledUntil: null }, now);
    expect(serviceForOrderType("ASPORTO", state).active).toBe(false);
    expect(state.pickup.label).toBe("Il ritiro in sede torna presto");
  });
});
