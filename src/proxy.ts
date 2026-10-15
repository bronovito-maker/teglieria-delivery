import { CONSENT_COOKIE, parseConsent, permitsMeta, safeMarketingReferrer } from '@/lib/cookie-consent';
import { publicReceipts, INTENT_PREFIX, RECEIPT_PREFIX, cookieOptions } from "@/lib/meta-purchase-server";
import { maintenancePageResponse } from "@/lib/site-maintenance";
import { updateSession } from "@/lib/auth/middleware";
import { NextResponse, NextRequest } from "next/server";
import { previewAccess } from "@/lib/preview-access";

function buildContentSecurityPolicy(nonce: string, metaAllowed: boolean): string {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${isDevelopment ? "'unsafe-eval'" : ""} https://maps.googleapis.com ${metaAllowed ? "https://connect.facebook.net" : ""}`
      .replace(/\s+/g, " ")
      .trim(),
    // Inline event handlers are unnecessary for the application.
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    // Maps and React components use dynamic style attributes.
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com ${metaAllowed ? "https://www.facebook.com" : ""}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://maps.googleapis.com https://places.googleapis.com https://routes.googleapis.com ${metaAllowed ? "https://www.facebook.com https://connect.facebook.net" : ""} ${isDevelopment ? "http: ws:" : ""}`
      .replace(/\s+/g, " ")
      .trim(),
    "frame-src 'self' https://www.google.com https://maps.google.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const privateAccess = await previewAccess(request);
  if (privateAccess) return privateAccess;
  const path = request.nextUrl.pathname;
  if (/^\/(rider|admin\/logistica)(\/|$)/.test(path)) return new NextResponse("Funzione non disponibile", { status: 404, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
  const maintenance = maintenancePageResponse(request.nextUrl.pathname);
  if (maintenance) return maintenance;

  const nonce = btoa(crypto.randomUUID());
  const consent = parseConsent(request.cookies.get(CONSENT_COOKIE)?.value);
  const receiptAllowed = path === "/acquisto-completato" && !request.nextUrl.search && (await publicReceipts(request.cookies.getAll(), consent)).length > 0;
  const metaAllowed = (permitsMeta(consent, request.nextUrl) || receiptAllowed)
    && safeMarketingReferrer(request.headers.get("referer") ?? "", process.env.UNIFIED_WEB_ORIGIN || request.nextUrl.origin);
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, metaAllowed);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-meta-route", path);
  requestHeaders.set("content-security-policy", contentSecurityPolicy);

  // Forward the nonce through the unified backend's navigation guard.
  const requestWithSecurityHeaders = new NextRequest(request, {
    headers: requestHeaders,
  });
  const response = await updateSession(requestWithSecurityHeaders);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  if (!permitsMeta(consent, request.nextUrl) || path === "/acquisto-completato") response.headers.set("Referrer-Policy", "no-referrer");
  // Never reuse a consented HTML/CSP response for a non-consenting visitor.
  if (!path.startsWith("/_next/") && !/\.[a-z0-9]+$/i.test(path)) response.headers.set("Cache-Control", "private, no-store");

  if (!consent?.marketing || !consent.adult) {
    for (const c of request.cookies.getAll()) if(c.name.startsWith(INTENT_PREFIX)||c.name.startsWith(RECEIPT_PREFIX)) response.cookies.set(c.name, "", cookieOptions(request, 0));
  }
  return response;
}

export const config = {
  // Keep auth endpoints out of the session-refresh pass: they manage their
  // own cookies during the same request.
  matcher: ["/:path*"],
};
