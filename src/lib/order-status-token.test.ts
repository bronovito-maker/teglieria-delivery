import { describe, expect, it } from "vitest";
import { getOrderStatusTokenTtlSeconds, hashOrderStatusToken, isOrderStatusTokenFresh } from "./order-status-token";

process.env.ORDER_STATUS_TOKEN_TTL_SECONDS = "3600";

describe("order status tokens", () => {
  it("uses a strong one-way hash for opaque tokens", () => {
    const token = "a".repeat(43);
    expect(hashOrderStatusToken(token)).toHaveLength(64);
    expect(hashOrderStatusToken(token)).not.toBe(token);
  });

  it("recognizes fresh and expired issuance timestamps", () => {
    const now = Date.now();
    expect(isOrderStatusTokenFresh(new Date(now - 3599 * 1000), now)).toBe(true);
    expect(isOrderStatusTokenFresh(new Date(now - 3601 * 1000), now)).toBe(false);
  });

  it("falls back to a safe TTL for invalid configuration", () => {
    process.env.ORDER_STATUS_TOKEN_TTL_SECONDS = "not-a-number";
    expect(getOrderStatusTokenTtlSeconds()).toBe(172800);
  });
});
