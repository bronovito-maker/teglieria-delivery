import crypto from "crypto";

function getSecret() {
  const secret = process.env.ORDER_STATUS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("ORDER_STATUS_TOKEN_SECRET non configurato");
  }
  return secret;
}

export function createOrderStatusToken(orderId: string, createdAt: Date | string) {
  const created = typeof createdAt === "string" ? createdAt : createdAt.toISOString();
  const payload = `${orderId}.${created}`;
  const sig = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyOrderStatusToken(token: string, orderId: string) {
  const parts = token.split(".");
  if (parts.length < 3) return false;
  const sig = parts.pop() as string;
  const id = parts.shift() as string;
  const created = parts.join(".");
  if (!id || !created || id !== orderId) return false;
  const payload = `${id}.${created}`;
  const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
