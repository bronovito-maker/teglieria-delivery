import { NextResponse } from "next/server";
import crypto from "crypto";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function getConfiguredOrigins(): Set<string> {
  const configured = [
    process.env.NEXT_PUBLIC_SITE_URL,
    ...(process.env.TRUSTED_ORIGINS || "").split(","),
  ];
  return new Set(
    configured
      .filter((value): value is string => Boolean(value))
      .map((value) => normalizeOrigin(value.trim()))
      .filter(Boolean),
  );
}

export function getTrustedSiteOrigin(request: Request): string | null {
  const configured = getConfiguredOrigins();
  if (configured.size > 0) return configured.values().next().value ?? null;

  if (process.env.NODE_ENV === "production") return null;

  const requestUrl = new URL(request.url);
  if (["localhost", "127.0.0.1", "::1"].includes(requestUrl.hostname)) return requestUrl.origin;
  return null;
}

export function enforceSameOrigin(request: Request) {
  const method = request.method.toUpperCase();
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) return null;

  const requestOrigin = request.headers.get("origin");
  if (!requestOrigin) {
    return NextResponse.json({ error: "Origin mancante" }, { status: 403 });
  }

  const requestUrl = new URL(request.url);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);
  const isLocalRequest = process.env.NODE_ENV !== "production" && localHosts.has(requestUrl.hostname);
  const configuredOrigins = getConfiguredOrigins();
  const allowedOrigins = isLocalRequest ? new Set([requestUrl.origin]) : configuredOrigins;

  // In production a missing static allowlist is a configuration error. Never
  // derive the trusted origin from the Host header supplied by the request.
  if (!allowedOrigins.has(normalizeOrigin(requestOrigin))) {
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
