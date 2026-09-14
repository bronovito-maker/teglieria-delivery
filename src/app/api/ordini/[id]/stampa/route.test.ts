import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUnique, getUser } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: { findUnique },
    rider: { findFirst: vi.fn() },
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ ok: true, remaining: 29 })),
}));
vi.mock("@/lib/request-security", () => ({
  getTrustedSiteOrigin: vi.fn(() => "https://staging-isolato.example.com"),
}));

import { GET } from "./route";

describe("GET /api/ordini/[id]/stampa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({
      data: { user: { id: "admin-1", email: "admin@example.com", app_metadata: { role: "admin" } } },
    });
    findUnique.mockResolvedValue({
      id: "order-1",
      orderCode: "D001",
      orderNumber: 1,
      type: "DELIVERY",
      channel: "WEB",
      createdAt: new Date("2026-09-14T17:00:00Z"),
      customerName: "Mario Rossi",
      customerPhone: "3331234567",
      address: "Via Roma 1",
      addressDetail: "Citofono Rossi",
      deliveryZone: "Centro",
      pickupTime: new Date("2026-09-14T17:00:00Z"),
      timeSlot: "19:00",
      subtotal: 24,
      clubSavings: 4,
      deliveryCost: 2,
      total: 26,
      notes: "Suonare una volta",
      riderId: null,
      rider: null,
      items: [{
        quantity: 2,
        productName: "La Regina",
        variant: null,
        additions: [{ name: "Olive" }],
        removals: null,
        notes: null,
        totalPrice: 24,
      }],
    });
  });

  it("renderizza roll 58 mm, fascia canonica e un solo avvio di stampa", async () => {
    const response = await GET(new Request("https://staging-isolato.example.com/api/ordini/order-1/stampa", {
      headers: { "x-nonce": "nonce-test" },
    }), { params: Promise.resolve({ id: "order-1" }) });

    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain("@page { size: 58mm 200mm; margin: 0; }");
    expect(html).toContain("html, body { width: 58mm; max-width: 58mm; }");
    expect(html).toContain(".receipt { width: 48mm; max-width: 48mm;");
    expect(html).toContain("width: 38mm; height: 38mm;");
    expect(html).toContain("Orario richiesto: 19:00/19:30");
    expect(html.match(/window\.print\(\)/g)).toHaveLength(1);
    expect(html).toContain("pageHeightMm");
  });

  it("genera un QR PNG ad alta risoluzione con URL rider dello staging", async () => {
    const response = await GET(new Request("https://staging-isolato.example.com/api/ordini/order-1/stampa"), {
      params: Promise.resolve({ id: "order-1" }),
    });
    const html = await response.text();
    const match = html.match(/src="data:image\/png;base64,([^"]+)"/);
    expect(match).not.toBeNull();
    const png = Buffer.from(match![1], "base64");
    expect(png.subarray(1, 4).toString()).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(768);
    expect(png.readUInt32BE(20)).toBe(768);
  });
});
