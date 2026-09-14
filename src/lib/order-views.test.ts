import { describe, expect, it } from "vitest";
import { toCustomerOrderView, toPublicTrackingOrderView, toRiderOrderView, type LoadedOrder } from "./order-views";

const order = {
  id: "order-1",
  orderCode: "D001",
  orderNumber: 1,
  type: "DELIVERY",
  channel: "WEB",
  status: "READY",
  paymentMethod: "CONTANTI",
  paymentStatus: "PENDING",
  customerName: "Mario",
  customerPhone: "3331234567",
  customerEmail: "mario@example.com",
  address: "Via Roma 1",
  addressDetail: null,
  deliveryZone: "Centro",
  deliveryCost: 2,
  estimatedTime: null,
  actualTime: null,
  pickupTime: null,
  timeSlot: "19:00",
  subtotal: 12,
  clubSavings: 4,
  total: 14,
  notes: "Citofonare",
  authUserId: "customer-auth-id",
  stripeSessionId: "cs_secret",
  stripePaymentIntentId: "pi_secret",
  idempotencyKey: "idem-secret",
  riderId: "rider-1",
  rider: { id: "rider-1", name: "Rider", authUserId: "rider-auth-id" },
  items: [],
  statusHistory: [],
} as unknown as LoadedOrder;

describe("order API views", () => {
  it("does not expose payment or auth internals to customers", () => {
    const view = toCustomerOrderView(order);
    expect(view.customerName).toBe("Mario");
    expect(view).not.toHaveProperty("authUserId");
    expect(view).not.toHaveProperty("stripeSessionId");
    expect(view).not.toHaveProperty("stripePaymentIntentId");
    expect(view).not.toHaveProperty("idempotencyKey");
    expect(view.rider).toEqual({ name: "Rider" });
    expect(Number(view.clubSavings)).toBe(4);
  });

  it("preserves the ingredient snapshot in customer order history", () => {
    const withSnapshot = {
      ...order,
      items: [{
        id: "item-1",
        productId: "schiacciatina-1",
        productName: "La Classica",
        quantity: 1,
        unitPrice: 8,
        totalPrice: 8,
        variant: null,
        additions: null,
        removals: null,
        notes: null,
        allergenSnapshot: null,
        ingredientSnapshot: ["Base schiacciatina 400 g", "prosciutto cotto", "fiordilatte"],
      }],
    } as unknown as LoadedOrder;

    expect(toCustomerOrderView(withSnapshot).items[0].ingredientSnapshot).toEqual([
      "Base schiacciatina 400 g",
      "prosciutto cotto",
      "fiordilatte",
    ]);
  });

  it("preserves authoritative line prices in the public confirmation view", () => {
    const withItems = {
      ...order,
      items: [{
        id: "item-1",
        productId: "regina",
        productName: "La Regina",
        quantity: 2,
        unitPrice: 4.5,
        standardUnitPrice: 5,
        totalPrice: 9,
        variant: null,
        additions: null,
        removals: null,
        notes: null,
        allergenSnapshot: null,
        ingredientSnapshot: null,
      }],
    } as unknown as LoadedOrder;

    const view = toPublicTrackingOrderView(withItems);
    expect(Number(view.items[0].unitPrice)).toBe(4.5);
    expect(Number(view.items[0].standardUnitPrice)).toBe(5);
    expect(Number(view.items[0].totalPrice)).toBe(9);
    expect(Number(view.subtotal)).toBe(12);
    expect(Number(view.total)).toBe(14);
    expect(view.timeSlot).toBe("19:00");
    expect(view).not.toHaveProperty("customerPhone");
    expect(view).not.toHaveProperty("customerEmail");
    expect(view).not.toHaveProperty("authUserId");
  });

  it("does not expose customer identity or payment internals to riders", () => {
    const view = toRiderOrderView(order);
    expect(view.customerPhone).toBe("3331234567");
    expect(view).not.toHaveProperty("customerEmail");
    expect(view).not.toHaveProperty("authUserId");
    expect(view).not.toHaveProperty("stripeSessionId");
    expect(view.rider).toEqual({ id: "rider-1", name: "Rider" });
  });
});
