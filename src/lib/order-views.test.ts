import { describe, expect, it } from "vitest";
import { toCustomerOrderView, toRiderOrderView, type LoadedOrder } from "./order-views";

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
