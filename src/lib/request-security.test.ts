import { describe, expect, it } from "vitest";
import { enforceSameOrigin, sanitizeInternalPath, safeEqual } from "./request-security";

describe("enforceSameOrigin", () => {
  it("allows mutating requests with matching origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.lateglieria.it";
    const req = new Request("https://www.lateglieria.it/api/ordini", {
      method: "POST",
      headers: { origin: "https://www.lateglieria.it" },
    });
    const result = enforceSameOrigin(req);
    expect(result).toBeNull();
  });

  it("blocks mutating requests with missing origin", async () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.lateglieria.it";
    const req = new Request("https://www.lateglieria.it/api/ordini", {
      method: "POST",
    });
    const result = enforceSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it("blocks mutating requests with foreign origin", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.lateglieria.it";
    const req = new Request("https://www.lateglieria.it/api/ordini", {
      method: "DELETE",
      headers: { origin: "https://evil.example" },
    });
    const result = enforceSameOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it("does not block safe methods", () => {
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.lateglieria.it";
    const req = new Request("https://www.lateglieria.it/api/ordini", {
      method: "GET",
    });
    const result = enforceSameOrigin(req);
    expect(result).toBeNull();
  });
});

describe("sanitizeInternalPath", () => {
  it("accepts internal paths and rejects external ones", () => {
    expect(sanitizeInternalPath("/ordine", "/")).toBe("/ordine");
    expect(sanitizeInternalPath("https://evil.example", "/ordine")).toBe("/ordine");
    expect(sanitizeInternalPath("//evil.example", "/ordine")).toBe("/ordine");
  });
});

describe("safeEqual", () => {
  it("compares equal-length secrets in constant-time helper", () => {
    expect(safeEqual("abcdef", "abcdef")).toBe(true);
    expect(safeEqual("abcdef", "abcdeg")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});
