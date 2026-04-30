import { NextResponse } from "next/server";
import crypto from "crypto";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function enforceSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) return null;

  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return NextResponse.json({ error: "Origin mancante" }, { status: 403 });
  }

  const expected =
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${new URL(request.url).protocol}//${request.headers.get("host") || new URL(request.url).host}`;

  if (normalizeOrigin(requestOrigin) !== normalizeOrigin(expected)) {
    return NextResponse.json({ error: "Origin non autorizzato" }, { status: 403 });
  }

  return null;
}

export function sanitizeInternalPath(path: string | null | undefined, fallback = "/") {
  if (!path) return fallback;
  if (!path.startsWith("/")) return fallback;
  if (path.startsWith("//")) return fallback;
  if (path.includes("://")) return fallback;
  return path;
}

export function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}
