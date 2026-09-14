import { beforeEach, describe, expect, it, vi } from "vitest";

const { signInWithPassword, exchangeCodeForSession, linkOrders } = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  linkOrders: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signInWithPassword, exchangeCodeForSession } })),
}));
vi.mock("@/lib/orders/link-user-orders", () => ({ linkUnclaimedOrdersToUser: linkOrders }));
vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ ok: true, remaining: 10 })),
}));
vi.mock("@/lib/request-security", () => ({
  enforceSameOrigin: vi.fn(() => null),
  getTrustedSiteOrigin: vi.fn(() => "https://www.lateglieria.it"),
  sanitizeInternalPath: vi.fn((value: string | null) => value?.startsWith("/") ? value : ""),
}));

import { POST as passwordLogin } from "./password/route";
import { GET as oauthCallback } from "./callback/route";

const user = {
  id: "customer-1",
  email: "customer@example.com",
  email_confirmed_at: "2026-09-11T00:00:00Z",
  app_metadata: { role: "customer" },
};

describe("collegamento ordini durante l'autenticazione", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    signInWithPassword.mockResolvedValue({ data: { user }, error: null });
    exchangeCodeForSession.mockResolvedValue({ data: { user }, error: null });
    linkOrders.mockResolvedValue({ count: 1 });
  });

  it("collega gli ordini nel login password prima di rispondere", async () => {
    const response = await passwordLogin(new Request("https://www.lateglieria.it/api/auth/password", {
      method: "POST",
      headers: { origin: "https://www.lateglieria.it", "content-type": "application/json" },
      body: JSON.stringify({ email: user.email, password: "password" }),
    }));

    expect(response.status).toBe(200);
    expect(linkOrders).toHaveBeenCalledWith(user);
  });

  it("attende il collegamento nel callback OAuth prima del redirect", async () => {
    let completeLink: ((value: { count: number }) => void) | undefined;
    linkOrders.mockReturnValue(new Promise((resolve) => { completeLink = resolve; }));

    let settled = false;
    const pendingResponse = oauthCallback(new Request("https://www.lateglieria.it/api/auth/callback?code=oauth-code&type=customer&next=/account/orders"));
    pendingResponse.then(() => { settled = true; });
    await vi.waitFor(() => expect(linkOrders).toHaveBeenCalledWith(user));
    await Promise.resolve();
    expect(settled).toBe(false);

    completeLink?.({ count: 1 });
    const response = await pendingResponse;
    expect(response.headers.get("location")).toBe("https://www.lateglieria.it/account/orders");
  });
});
