import { describe, expect, it } from "vitest";
import {
  buildOrderTimeSlot,
  formatOrderTimeSlot,
  generateOrderTimeSlots,
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

  it("keeps pickup labels as a single time", () => {
    expect(buildOrderTimeSlot("ASPORTO", ORDER_TIME_SLOT_CONFIG.ASPORTO.start)).toMatchObject({
      time: "16:00",
      start: "16:00",
      end: "16:30",
      label: "16:00",
    });
  });

  it("falls back to the stored value when a legacy slot is malformed", () => {
    expect(formatOrderTimeSlot("DELIVERY", "sera")).toBe("sera");
  });

  it("does not create an interval that exceeds the service end", () => {
    expect(generateOrderTimeSlots("DELIVERY", "19:00", "19:20")).toEqual([]);
  });
});
