import { maintenancePageResponse } from "@/lib/site-maintenance";
import { updateSession } from "@/lib/auth/middleware";
import { NextResponse, NextRequest } from "next/server";
import { previewAccess } from "@/lib/preview-access";

function buildContentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${isDevelopment ? "'unsafe-eval'" : ""} https://maps.googleapis.com`
      .replace(/\s+/g, " ")
      .trim(),
    // Inline event handlers are unnecessary for the application.
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    // Maps and React components use dynamic style attributes.
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://maps.googleapis.com https://places.googleapis.com https://routes.googleapis.com ${isDevelopment ? "http: ws:" : ""}`
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
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", contentSecurityPolicy);

  // Forward the nonce through the unified backend's navigation guard.
  const requestWithSecurityHeaders = new NextRequest(request, {
    headers: requestHeaders,
  });
  const response = await updateSession(requestWithSecurityHeaders);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  // Keep auth endpoints out of the session-refresh pass: they manage their
  // own cookies during the same request.
  matcher: ["/:path*"],
};
