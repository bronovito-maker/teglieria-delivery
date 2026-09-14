import { describe, expect, it, vi } from "vitest";
import { linkUnclaimedOrdersToUser, normalizedVerifiedEmail } from "./link-user-orders";

describe("linkUnclaimedOrdersToUser", () => {
  it("normalizza una email verificata e collega solo ordini senza utente", async () => {
    const updateMany = vi.fn(async () => ({ count: 2 }));
    const user = { id: "user-1", email: "  Mario.Rossi@Example.COM ", email_confirmed_at: "2026-09-11T00:00:00Z" };

    expect(normalizedVerifiedEmail(user)).toBe("mario.rossi@example.com");
    await expect(linkUnclaimedOrdersToUser(user, { order: { updateMany } } as never)).resolves.toEqual({ count: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        authUserId: null,
        customerEmail: { equals: "mario.rossi@example.com", mode: "insensitive" },
      },
      data: { authUserId: "user-1" },
    });
  });

  it("non collega ordini se l'email non è verificata", async () => {
    const updateMany = vi.fn();
    await expect(linkUnclaimedOrdersToUser(
      { id: "user-1", email: "mario@example.com", email_confirmed_at: undefined },
      { order: { updateMany } } as never,
    )).resolves.toEqual({ count: 0 });
    expect(updateMany).not.toHaveBeenCalled();
  });
});
