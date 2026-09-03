import { describe, expect, it } from "vitest";
import { createOrderSchema, generateOrderCode, orderPatchSchema } from "./orders";

const validItem = {
  productId: "prod_1",
  productName: "Margherita",
  quantity: 2,
  unitPrice: 8,
  totalPrice: 16,
};

describe("createOrderSchema", () => {
  it("accepts a valid pickup order", () => {
    const result = createOrderSchema.safeParse({
      type: "ASPORTO",
      channel: "WEB",
      customerName: "Mario Rossi",
      customerPhone: "3331234567",
      pickupTime: "2026-04-29T18:30:00.000Z",
      subtotal: 16,
      total: 16,
      items: [validItem],
    });

    expect(result.success).toBe(true);
  });

  it("requires an address for delivery orders", () => {
    const result = createOrderSchema.safeParse({
      type: "DELIVERY",
      channel: "WEB",
      customerName: "Mario Rossi",
      customerPhone: "3331234567",
      subtotal: 16,
      total: 18.5,
      items: [validItem],
    });

    expect(result.success).toBe(false);
  });

  it("rejects delivery before the delivery service starts", () => {
    const result = createOrderSchema.safeParse({
      type: "DELIVERY",
      channel: "WEB",
      customerName: "Mario Rossi",
      customerPhone: "3331234567",
      address: "Via Roma 1",
      timeSlot: "18:30",
      subtotal: 16,
      total: 18.5,
      items: [validItem],
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty carts", () => {
    const result = createOrderSchema.safeParse({
      type: "ASPORTO",
      customerName: "Mario Rossi",
      customerPhone: "3331234567",
      subtotal: 0,
      total: 0,
      items: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts Stripe as an online payment method", () => {
    const result = createOrderSchema.safeParse({
      type: "DELIVERY",
      channel: "WEB",
      customerName: "Mario Rossi",
      customerPhone: "3331234567",
      address: "Via Roma 1",
      paymentMethod: "STRIPE",
      subtotal: 16,
      total: 18.5,
      items: [validItem],
    });

    expect(result.success).toBe(true);
  });
});

describe("orderPatchSchema", () => {
  it("accepts controlled order state changes", () => {
    const result = orderPatchSchema.safeParse({
      status: "CONFIRMED",
      estimatedTime: "2026-04-29T18:30:00.000Z",
      statusNote: "Confermato",
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown fields and invalid statuses", () => {
    const result = orderPatchSchema.safeParse({
      status: "SHIPPED",
      admin: true,
    });

    expect(result.success).toBe(false);
  });
});

describe("generateOrderCode", () => {
  it("uses the DB sequence number instead of a count", () => {
    expect(generateOrderCode("ASPORTO", 7)).toBe("A007");
    expect(generateOrderCode("DELIVERY", 1042)).toBe("D1042");
  });
});
