import { updateSession } from "@/lib/supabase/middleware";
import { NextRequest } from "next/server";

function buildContentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${isDevelopment ? "'unsafe-eval'" : ""} https://maps.googleapis.com https://www.googletagmanager.com https://connect.facebook.net https://va.vercel-scripts.com https://cdn.zirel.org`
      .replace(/\s+/g, " ")
      .trim(),
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "img-src 'self' data: https://www.facebook.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com https://*.supabase.co https://*.zirel.org",
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://maps.googleapis.com https://routes.googleapis.com https://*.supabase.co https://vitals.vercel-insights.com https://*.zirel.org https://*.up.railway.app wss://*.supabase.co ${isDevelopment ? "http: ws:" : ""}`
      .replace(/\s+/g, " ")
      .trim(),
    "frame-src 'self' https://*.zirel.org https://www.google.com https://maps.google.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", contentSecurityPolicy);

  // Preserve Supabase's session refresh while forwarding the nonce to the
  // rendered request. Attach the same CSP to the resulting response.
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth/password|api/auth/callback|api/auth/session|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
