import { beforeEach, describe, expect, it, vi } from "vitest";

const { orderFindUnique, orderUpdateMany, orderUpdate, gestionaleUpdate, orderDelete, auditEventCreate, transaction, riderFindFirst, getUser, signInWithPassword } = vi.hoisted(() => ({
  orderFindUnique: vi.fn(),
  orderUpdateMany: vi.fn(),
  orderUpdate: vi.fn(),
  gestionaleUpdate: vi.fn(),
  orderDelete: vi.fn(),
  auditEventCreate: vi.fn(),
  transaction: vi.fn(),
  riderFindFirst: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique: orderFindUnique, updateMany: orderUpdateMany, update: orderUpdate, delete: orderDelete },
    auditEvent: { create: auditEventCreate },
    gestionaleOrder: { update: gestionaleUpdate },
    rider: { findFirst: riderFindFirst },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser, signInWithPassword } })),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ ok: true, remaining: 59 })),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: vi.fn(() => undefined) })),
}));

vi.mock("@/lib/order-status-token", () => ({
  getOrderStatusCookieName: vi.fn((id: string) => `order_status_${id}`),
  getOrderStatusTokenFromRequest: vi.fn(() => null),
  getOrderStatusTokenTtlSeconds: vi.fn(() => 172800),
  verifyOrderStatusToken: vi.fn(async () => false),
}));

vi.mock("@/lib/request-security", () => ({
  enforceSameOrigin: vi.fn(() => null),
  safeEqual: vi.fn(() => false),
}));

vi.mock("@/lib/customer-notifications", () => ({
  notifyCustomerOrderStatus: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendRiderDepartedEmail: vi.fn(),
  sendTimeUpdateEmail: vi.fn(),
  sendOrderConfirmedEmail: vi.fn(),
  sendOrderReadyEmail: vi.fn(),
  sendOrderDeliveredEmail: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(),
}));

vi.mock("@/lib/stripe-order-notifications", () => ({
  markStripePaymentSucceeded: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn(),
}));

import { DELETE, GET, PATCH } from "./route";

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    orderCode: "D001",
    orderNumber: 1,
    type: "DELIVERY",
    status: "READY",
    paymentMethod: "CONTANTI",
    paymentStatus: "PENDING",
    authUserId: "customer-user",
    customerEmail: "customer@example.com",
    customerName: "Mario Rossi",
    customerPhone: "3331234567",
    address: "Via Roma 1",
    addressDetail: null,
    deliveryZone: null,
    deliveryCost: 2,
    estimatedTime: null,
    actualTime: null,
    pickupTime: null,
    timeSlot: null,
    subtotal: 12,
    total: 14,
    notes: null,
    riderId: "rider-1",
    rider: { id: "rider-1", name: "Rider", authUserId: "rider-user" },
    items: [],
    statusHistory: [],
    refunds: [],
    createdAt: new Date("2026-01-01T10:00:00Z"),
    updatedAt: new Date("2026-01-01T10:00:00Z"),
    ...overrides,
  };
}

function request() {
  return new Request("https://www.lateglieria.it/api/ordini/order-1");
}

describe("GET /api/ordini/[id] object authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderFindUnique.mockResolvedValue(makeOrder());
    riderFindFirst.mockResolvedValue(null);
    getUser.mockResolvedValue({ data: { user: null } });
  });

  it("rejects unauthenticated access without a valid tracking token", async () => {
    const response = await GET(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(401);
  });

  it("rejects a rider who is not assigned to the order", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "rider-user", email: "rider@example.com" } } });
    riderFindFirst.mockResolvedValue({ id: "rider-1" });
    orderFindUnique.mockResolvedValue(makeOrder({
      riderId: "another-rider",
      rider: { id: "another-rider", name: "Another Rider", authUserId: "another-user" },
    }));

    const response = await GET(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(403);
  });

  it("ignores an admin role supplied only through user_metadata", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "attacker", email: "attacker@example.com", user_metadata: { role: "admin" } } },
    });

    const response = await GET(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(403);
  });

  it("does not grant access by email when the order belongs to another user", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "different-user", email: "customer@example.com", email_confirmed_at: "2026-09-11T00:00:00Z" } },
    });

    const response = await GET(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(403);
  });

  it("allows a customer to read an order linked to their user id", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "customer-user", email: "another@example.com" } } });

    const response = await GET(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.customerName).toBe("Mario Rossi");
    expect(body).not.toHaveProperty("authUserId");
  });

  it("allows the assigned rider and strips internal customer/payment fields", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "rider-user", email: "rider@example.com" } } });
    riderFindFirst.mockResolvedValue({ id: "rider-1" });

    const response = await GET(request(), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.riderId).toBe("rider-1");
    expect(body.customerPhone).toBe("3331234567");
    expect(body).not.toHaveProperty("customerEmail");
    expect(body).not.toHaveProperty("authUserId");
    expect(body).not.toHaveProperty("stripeSessionId");
  });
});

describe("PATCH /api/ordini/[id] rider authorization and transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orderFindUnique.mockResolvedValue(makeOrder());
    riderFindFirst.mockResolvedValue({ id: "rider-1" });
    getUser.mockResolvedValue({ data: { user: { id: "rider-user", email: "rider@example.com" } } });
  });

  it("rejects rider attempts to change the assignment", async () => {
    const response = await PATCH(new Request("https://www.lateglieria.it/api/ordini/order-1", {
      method: "PATCH",
      headers: { origin: "https://www.lateglieria.it", "content-type": "application/json" },
      body: JSON.stringify({ riderId: "another-rider" }),
    }), { params: Promise.resolve({ id: "order-1" }) });

    expect(response.status).toBe(403);
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects a rider transition that skips the delivery workflow", async () => {
    const response = await PATCH(new Request("https://www.lateglieria.it/api/ordini/order-1", {
      method: "PATCH",
      headers: { origin: "https://www.lateglieria.it", "content-type": "application/json" },
      body: JSON.stringify({ status: "DELIVERED", deliveryStatus: "DELIVERED" }),
    }), { params: Promise.resolve({ id: "order-1" }) });

    expect(response.status).toBe(409);
    expect(orderUpdateMany).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/ordini/[id] permanent deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.ADMIN_ORDER_DELETE_VERIFICATION_MODE;
    orderFindUnique.mockResolvedValue({ id: "order-1", orderCode: "D001", status: "CANCELLED" });
    orderDelete.mockResolvedValue({ id: "order-1" });
    auditEventCreate.mockResolvedValue({ id: "audit-1" });
    transaction.mockImplementation(async (queries: Promise<unknown>[]) => Promise.all(queries));
  });

  it("distinguishes insufficient permissions", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "operator-1", email: "operator@example.com", app_metadata: { role: "operator" } } } });
    const response = await DELETE(new Request("https://www.lateglieria.it/api/ordini/order-1", {
      method: "DELETE",
      headers: { origin: "https://www.lateglieria.it", "content-type": "application/json" },
      body: JSON.stringify({ adminPassword: "password", confirmation: "D001" }),
    }), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "ADMIN_PERMISSION_REQUIRED" });
  });

  it("distinguishes an invalid reauthentication credential", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "admin-1", email: "admin@example.com", app_metadata: { role: "admin" } } } });
    signInWithPassword.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    const response = await DELETE(new Request("https://www.lateglieria.it/api/ordini/order-1", {
      method: "DELETE",
      headers: { origin: "https://www.lateglieria.it", "content-type": "application/json" },
      body: JSON.stringify({ adminPassword: "wrong", confirmation: "D001" }),
    }), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "CREDENTIAL_INVALID" });
  });

  it("requires the order code and stores an audit before permanent deletion", async () => {
    const user = { id: "admin-1", email: "admin@example.com", app_metadata: { role: "admin" } };
    getUser.mockResolvedValue({ data: { user } });
    signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    const response = await DELETE(new Request("https://www.lateglieria.it/api/ordini/order-1", {
      method: "DELETE",
      headers: { origin: "https://www.lateglieria.it", "content-type": "application/json" },
      body: JSON.stringify({ adminPassword: "password", confirmation: "D001" }),
    }), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    expect(auditEventCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ action: "order.delete", entityId: "order-1" }) }));
    expect(orderDelete).toHaveBeenCalledWith({ where: { id: "order-1" } });
  });
  it("retains cancellation for a queued order without requiring Banco acceptance", async () => {
    const user = { id: "admin-1", email: "admin@example.com", app_metadata: { role: "admin" } };
    getUser.mockResolvedValue({ data: { user } });
    signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    orderFindUnique.mockResolvedValue({ id: "order-1", orderCode: "D001", status: "RECEIVED", gestionaleOrder: { orderId: "order-1" } });
    const response = await DELETE(new Request("https://www.lateglieria.it/api/ordini/order-1", {
      method: "DELETE", headers: { "content-type": "application/json" },
      body: JSON.stringify({ adminPassword: "password", confirmation: "D001" }),
    }), { params: Promise.resolve({ id: "order-1" }) });
    expect(response.status).toBe(200);
    expect(orderDelete).not.toHaveBeenCalled();
    expect(orderUpdate).toHaveBeenCalledWith({ where: { id: "order-1" }, data: { status: "CANCELLED", statusHistory: { create: { status: "CANCELLED" } } } });
    expect(gestionaleUpdate).toHaveBeenCalledWith({ where: { orderId: "order-1" }, data: { nextPollAt: expect.any(Date), lastError: null } });
    expect(orderUpdate.mock.calls[0][0].data).not.toHaveProperty("paymentStatus");
  });

});
