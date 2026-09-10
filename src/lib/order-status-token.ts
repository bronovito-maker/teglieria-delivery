import crypto from "crypto";
import { prisma } from "./prisma";

const DEFAULT_TOKEN_TTL_SECONDS = 48 * 60 * 60;
const ORDER_STATUS_COOKIE_PREFIX = "order_status_";

export function getOrderStatusTokenTtlSeconds(): number {
  const configured = Number.parseInt(
    process.env.ORDER_STATUS_TOKEN_TTL_SECONDS || String(DEFAULT_TOKEN_TTL_SECONDS),
    10,
  );
  return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_TOKEN_TTL_SECONDS;
}

export function hashOrderStatusToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function isOrderStatusTokenFresh(createdAt: Date | string, now = Date.now()): boolean {
  const timestamp = typeof createdAt === "string" ? Date.parse(createdAt) : createdAt.getTime();
  if (!Number.isFinite(timestamp)) return false;
  return timestamp <= now + 5 * 60 * 1000 && now - timestamp <= getOrderStatusTokenTtlSeconds() * 1000;
}

export function getOrderStatusCookieName(orderId: string): string {
  return `${ORDER_STATUS_COOKIE_PREFIX}${orderId}`;
}

export function getOrderStatusTokenFromRequest(request: Request): string | null {
  return request.headers.get("x-order-status-token")?.trim() || null;
}

/** Issue a random opaque token; only its SHA-256 hash is persisted. */
export async function createOrderStatusToken(orderId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + getOrderStatusTokenTtlSeconds() * 1000);
  await prisma.orderStatusToken.create({
    data: { orderId, tokenHash: hashOrderStatusToken(token), expiresAt },
  });
  return token;
}

export async function verifyOrderStatusToken(token: string, orderId: string): Promise<boolean> {
  if (!token || token.length < 32 || token.length > 128) return false;
  const record = await prisma.orderStatusToken.findFirst({
    where: {
      orderId,
      tokenHash: hashOrderStatusToken(token),
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true },
  });
  return Boolean(record);
}

export async function revokeOrderStatusTokens(orderId: string): Promise<void> {
  await prisma.orderStatusToken.updateMany({
    where: { orderId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
