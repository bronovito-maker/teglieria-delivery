import { describe, expect, it } from "vitest";
import { escapeHtml, safeHttpUrl } from "./html";

describe("HTML safety helpers", () => {
  it("escapes text and attribute metacharacters", () => {
    expect(escapeHtml(`<img src=x onerror='alert(1)'>`)).toBe(
      "&lt;img src=x onerror=&#39;alert(1)&#39;&gt;",
    );
  });

  it("allows only absolute HTTP(S) URLs", () => {
    expect(safeHttpUrl("https://example.com/a?x=1&y=2")).toBe("https://example.com/a?x=1&amp;y=2");
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
  });
});
