import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyAdminDeletionCredential } from "./admin-delete-verification";

const originalMode = process.env.ADMIN_ORDER_DELETE_VERIFICATION_MODE;
const originalSecret = process.env.ADMIN_ORDER_DELETE_PASSWORD;

afterEach(() => {
  if (originalMode === undefined) delete process.env.ADMIN_ORDER_DELETE_VERIFICATION_MODE;
  else process.env.ADMIN_ORDER_DELETE_VERIFICATION_MODE = originalMode;
  if (originalSecret === undefined) delete process.env.ADMIN_ORDER_DELETE_PASSWORD;
  else process.env.ADMIN_ORDER_DELETE_PASSWORD = originalSecret;
});

describe("admin order deletion verification", () => {
  it("reauthenticates the same Admin account by default", async () => {
    delete process.env.ADMIN_ORDER_DELETE_VERIFICATION_MODE;
    const signInWithPassword = vi.fn(async () => ({ data: { user: { id: "admin-1" } }, error: null }));
    await expect(verifyAdminDeletionCredential({
      auth: { signInWithPassword },
      user: { id: "admin-1", email: "admin@example.com" },
      credential: "password",
    })).resolves.toEqual({ ok: true, method: "reauth" });
  });

  it("returns distinct missing and invalid credential results", async () => {
    const auth = { signInWithPassword: vi.fn(async () => ({ data: { user: null }, error: new Error("invalid") })) };
    await expect(verifyAdminDeletionCredential({ auth, user: { id: "admin-1", email: "admin@example.com" } })).resolves.toEqual({ ok: false, code: "CREDENTIAL_REQUIRED" });
    await expect(verifyAdminDeletionCredential({ auth, user: { id: "admin-1", email: "admin@example.com" }, credential: "wrong" })).resolves.toEqual({ ok: false, code: "CREDENTIAL_INVALID" });
  });

  it("fails closed when optional server-secret mode is not configured", async () => {
    process.env.ADMIN_ORDER_DELETE_VERIFICATION_MODE = "server-secret";
    delete process.env.ADMIN_ORDER_DELETE_PASSWORD;
    const auth = { signInWithPassword: vi.fn() } as never;
    await expect(verifyAdminDeletionCredential({ auth, user: { id: "admin-1" }, credential: "value" })).resolves.toEqual({ ok: false, code: "VERIFICATION_NOT_CONFIGURED" });
  });
});
