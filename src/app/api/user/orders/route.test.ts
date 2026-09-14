import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, findMany } = vi.hoisted(() => ({ getUser: vi.fn(), findMany: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { order: { findMany } } }));

import { GET } from "./route";

describe("GET /api/user/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([]);
  });

  it("legge esclusivamente gli ordini collegati all'utente autenticato", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const response = await GET();
    expect(response.status).toBe(200);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { authUserId: "user-1" } }));
  });

  it("non interroga gli ordini senza una sessione", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const response = await GET();
    expect(response.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });
});
