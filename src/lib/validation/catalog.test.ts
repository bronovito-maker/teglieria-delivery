import { describe, expect, it } from "vitest";
import {
  adminConfigSchema,
  categoryCreateSchema,
  closureUpsertSchema,
  logisticsSlotsQuerySchema,
  productCreateSchema,
  scheduleDaysSchema,
} from "./catalog";

describe("categoryCreateSchema", () => {
  it("rejects blank category names", () => {
    expect(categoryCreateSchema.safeParse({ name: "   " }).success).toBe(false);
  });
});

describe("productCreateSchema", () => {
  it("accepts a product with nested options", () => {
    const result = productCreateSchema.safeParse({
      name: "Margherita",
      price: 8,
      categoryId: "cat_1",
      variants: [{ name: "Grande", priceDelta: 2 }],
      additions: [{ name: "Bufala", price: 1.5 }],
      removals: [{ name: "Basilico" }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects negative product prices", () => {
    const result = productCreateSchema.safeParse({
      name: "Margherita",
      price: -1,
      categoryId: "cat_1",
    });

    expect(result.success).toBe(false);
  });
});

describe("admin schemas", () => {
  it("validates closure dates", () => {
    expect(closureUpsertSchema.safeParse({ date: "2026-04-29" }).success).toBe(true);
    expect(closureUpsertSchema.safeParse({ date: "29/04/2026" }).success).toBe(false);
  });

  it("requires seven schedule days", () => {
    expect(scheduleDaysSchema.safeParse([]).success).toBe(false);
  });

  it("rejects non-positive slot limits", () => {
    expect(adminConfigSchema.safeParse({ maxOrdersPerSlot: 0 }).success).toBe(false);
  });

  it("accepts the service type for slot availability", () => {
    expect(logisticsSlotsQuerySchema.safeParse({ date: "2026-04-29", type: "DELIVERY" }).success).toBe(true);
    expect(logisticsSlotsQuerySchema.safeParse({ date: "2026-04-29", type: "INVALID" }).success).toBe(false);
  });
});
