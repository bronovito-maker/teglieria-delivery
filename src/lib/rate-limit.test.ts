import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit } from "./rate-limit";

const previousUrl = process.env.UPSTASH_REDIS_REST_URL;
const previousToken = process.env.UPSTASH_REDIS_REST_TOKEN;

afterEach(() => {
  vi.unstubAllGlobals();
  if (previousUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = previousUrl;
  if (previousToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = previousToken;
});

describe("distributed rate limiting", () => {
  it("fails closed when configured Upstash is unavailable", async () => {
    process.env.UPSTASH_REDIS_REST_URL = "https://rate-limit.example.invalid";
    process.env.UPSTASH_REDIS_REST_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    await expect(rateLimit("security-test", 10, 60_000)).resolves.toEqual({
      ok: false,
      remaining: 0,
    });
  });
});
