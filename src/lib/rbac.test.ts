import { describe, expect, it } from "vitest";
import { getUserRole, hasAdminPanelAccess, isAdminUser, isOperatorUser } from "./rbac";

describe("RBAC", () => {
  it("ignores user-controlled user_metadata roles", () => {
    const user = {
      email: "customer@example.com",
      user_metadata: { role: "admin" },
    };

    expect(getUserRole(user)).toBeNull();
    expect(isAdminUser(user)).toBe(false);
    expect(isOperatorUser(user)).toBe(false);
    expect(hasAdminPanelAccess(user)).toBe(false);
  });

  it("accepts a server-assigned app_metadata operator role", () => {
    const user = {
      email: "operator@example.com",
      app_metadata: { role: "operator" },
    };

    expect(getUserRole(user)).toBe("operator");
    expect(isOperatorUser(user)).toBe(true);
    expect(hasAdminPanelAccess(user)).toBe(true);
  });

  it("does not fail open when the legacy strict flag is false", () => {
    process.env.ADMIN_RBAC_STRICT = "false";
    expect(hasAdminPanelAccess({ email: "customer@example.com" })).toBe(false);
  });
});
