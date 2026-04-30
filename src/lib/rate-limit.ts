type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function cleanup(now: number) {
  for (const [key, value] of buckets.entries()) {
    if (value.resetAt <= now) buckets.delete(key);
  }
}

export function getClientIp(headers: Headers) {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip") || "unknown";
}

export function rateLimitInMemory(key: string, max: number, windowMs: number) {
  const now = Date.now();
  cleanup(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (bucket.count >= max) {
    return { ok: false, remaining: 0 };
  }
  bucket.count += 1;
  return { ok: true, remaining: max - bucket.count };
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url, token };
}

async function upstashCommand(command: string[]) {
  const cfg = getUpstashConfig();
  if (!cfg) return null;

  const endpoint = `${cfg.url}/${command.map(encodeURIComponent).join("/")}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Upstash command failed: ${res.status}`);
  }
  return res.json() as Promise<{ result?: unknown }>;
}

export async function rateLimit(key: string, max: number, windowMs: number) {
  const cfg = getUpstashConfig();
  if (!cfg) return rateLimitInMemory(key, max, windowMs);

  try {
    const windowSlot = Math.floor(Date.now() / windowMs);
    const redisKey = `rl:${key}:${windowSlot}`;
    const ttlSec = Math.max(1, Math.ceil(windowMs / 1000));

    const incr = await upstashCommand(["INCR", redisKey]);
    const current = Number(incr?.result ?? 0);

    if (current <= 1) {
      await upstashCommand(["EXPIRE", redisKey, String(ttlSec)]);
    }

    if (current > max) return { ok: false, remaining: 0 };
    return { ok: true, remaining: Math.max(0, max - current) };
  } catch {
    // Fail-safe: fallback in-memory to avoid taking down requests.
    return rateLimitInMemory(key, max, windowMs);
  }
}
