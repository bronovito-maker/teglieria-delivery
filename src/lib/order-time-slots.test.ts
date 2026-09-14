import { describe, expect, it } from "vitest";
import {
  buildOrderTimeSlot,
  formatOrderTimeSlot,
  generateOrderTimeSlots,
  getRomeDayBounds,
  isOrderTimeAllowed,
  ORDER_TIME_SLOT_CONFIG,
} from "./order-time-slots";

describe("shared order time slots", () => {
  it("generates the six canonical delivery intervals", () => {
    expect(generateOrderTimeSlots("DELIVERY").map((slot) => slot.label)).toEqual([
      "19:00/19:30",
      "19:30/20:00",
      "20:00/20:30",
      "20:30/21:00",
      "21:00/21:30",
      "21:30/22:00",
    ]);
  });

  it("formats pickup slots as intervals too", () => {
    expect(buildOrderTimeSlot("ASPORTO", ORDER_TIME_SLOT_CONFIG.ASPORTO.start)).toMatchObject({
      time: "16:00",
      start: "16:00",
      end: "16:30",
      label: "16:00/16:30",
    });
  });

  it("accepts only canonical starts, never arbitrary minutes", () => {
    expect(isOrderTimeAllowed("DELIVERY", "19:00")).toBe(true);
    expect(isOrderTimeAllowed("DELIVERY", "21:30")).toBe(true);
    expect(isOrderTimeAllowed("DELIVERY", "18:30")).toBe(false);
    expect(isOrderTimeAllowed("DELIVERY", "19:15")).toBe(false);
  });

  it("uses Europe/Rome boundaries across daylight-saving changes", () => {
    const spring = getRomeDayBounds("2026-03-29");
    const autumn = getRomeDayBounds("2026-10-25");
    expect(spring.lt.getTime() - spring.gte.getTime()).toBe(23 * 60 * 60 * 1000);
    expect(autumn.lt.getTime() - autumn.gte.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("falls back to the stored value when a legacy slot is malformed", () => {
    expect(formatOrderTimeSlot("DELIVERY", "sera")).toBe("sera");
  });

  it("does not create an interval that exceeds the service end", () => {
    expect(generateOrderTimeSlots("DELIVERY", "19:00", "19:20")).toEqual([]);
  });
});
