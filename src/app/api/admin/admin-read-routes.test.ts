import { beforeEach, describe, expect, it, vi } from "vitest";

const { closedDateFindMany, dayScheduleFindMany, getUser } = vi.hoisted(() => ({
  closedDateFindMany: vi.fn(),
  dayScheduleFindMany: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    closedDate: { findMany: closedDateFindMany },
    daySchedule: { findMany: dayScheduleFindMany },
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

import { GET as getClosures } from "./chiusure/route";
import { GET as getSchedules } from "./orari/route";

describe("admin read routes authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: null } });
    closedDateFindMany.mockResolvedValue([]);
    dayScheduleFindMany.mockResolvedValue([]);
  });

  it.each([
    ["closed dates", getClosures],
    ["schedules", getSchedules],
  ])("rejects unauthenticated reads of %s", async (_label, handler) => {
    const response = await handler();
    expect(response.status).toBe(401);
  });

  it("allows an operator to read both protected resources", async () => {
    getUser.mockResolvedValue({
      data: { user: { id: "operator-1", app_metadata: { role: "operator" } } },
    });
    closedDateFindMany.mockResolvedValue([{ date: "2026-09-04", reason: null }]);
    dayScheduleFindMany.mockResolvedValue([]);

    const [closuresResponse, schedulesResponse] = await Promise.all([
      getClosures(),
      getSchedules(),
    ]);

    expect(closuresResponse.status).toBe(200);
    expect(await closuresResponse.json()).toHaveLength(1);
    expect(schedulesResponse.status).toBe(200);
    expect(await schedulesResponse.json()).toHaveLength(7);
  });
});
