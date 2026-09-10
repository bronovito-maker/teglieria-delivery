import { describe, expect, it } from "vitest";
import { safeJsonLd } from "./json-ld";

describe("safeJsonLd", () => {
  it("cannot terminate a script tag with user-controlled text", () => {
    const result = safeJsonLd({ description: "</script><img src=x>" });
    expect(result).not.toContain("</script>");
    expect(result).toContain("\\u003c/script\\u003e");
  });
});
