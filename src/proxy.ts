import { ATTRIBUTION_COOKIE, onlyAttributionQuery, safeCampaign } from '@/lib/analytics-attribution';
import { CONSENT_COOKIE, parseConsent, permitsAnalytics, permitsMeta, safeMarketingReferrer } from '@/lib/cookie-consent';
import { publicReceipts, INTENT_PREFIX, RECEIPT_PREFIX, cookieOptions } from "@/lib/meta-purchase-server";
import { maintenancePageResponse } from "@/lib/site-maintenance";
import { updateSession } from "@/lib/auth/middleware";
import { NextResponse, NextRequest } from "next/server";
import { previewAccess } from "@/lib/preview-access";

function buildContentSecurityPolicy(nonce: string, metaAllowed: boolean, gaAllowed: boolean): string {
  const isDevelopment = process.env.NODE_ENV !== "production";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' ${isDevelopment ? "'unsafe-eval'" : ""} https://maps.googleapis.com ${metaAllowed ? "https://connect.facebook.net" : ""} ${gaAllowed ? "https://www.googletagmanager.com" : ""}`
      .replace(/\s+/g, " ")
      .trim(),
    // Inline event handlers are unnecessary for the application.
    "script-src-attr 'none'",
    `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    // Maps and React components use dynamic style attributes.
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-attr 'unsafe-inline'",
    `img-src 'self' data: https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com ${metaAllowed ? "https://www.facebook.com" : ""} ${gaAllowed ? "https://www.google-analytics.com https://region1.google-analytics.com" : ""}`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' https://maps.googleapis.com https://places.googleapis.com https://routes.googleapis.com ${metaAllowed ? "https://www.facebook.com https://connect.facebook.net" : ""} ${gaAllowed ? "https://www.google-analytics.com https://region1.google-analytics.com https://analytics.google.com" : ""} ${isDevelopment ? "http: ws:" : ""}`
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
  // Remove only marketing query parameters on known public pages, after consent.
  // Unknown/functional parameters keep their original behavior and block SDK loading.
  const clean=request.nextUrl.clone();clean.search='';
  if(consent?.adult&&(consent.marketing||consent.analytics)&&onlyAttributionQuery(request.nextUrl)&&(permitsMeta(consent,clean)||permitsAnalytics(consent,clean))){
    const redirected=NextResponse.redirect(clean,303);redirected.headers.set('Referrer-Policy','no-referrer');redirected.headers.set('Cache-Control','private, no-store');
    const options={path:'/',sameSite:'lax' as const,secure:new URL(process.env.UNIFIED_WEB_ORIGIN||request.url).protocol==='https:',maxAge:1800};
    if(consent.analytics)redirected.cookies.set(ATTRIBUTION_COOKIE,JSON.stringify({receiptId:consent.receiptId,at:Date.now(),values:safeCampaign(request.nextUrl.searchParams)}),options);
    const click=request.nextUrl.searchParams.get('fbclid');
    if(consent.marketing&&click&&/^[A-Za-z0-9_-]{20,512}$/.test(click))redirected.cookies.set('_fbc','fb.1.'+Date.now()+'.'+click,{...options,maxAge:90*86400});
    return redirected;
  }
  const receiptAllowed = path === "/acquisto-completato" && !request.nextUrl.search && (await publicReceipts(request.cookies.getAll(), consent)).length > 0;
  const metaAllowed = (permitsMeta(consent, request.nextUrl) || (consent?.marketing && receiptAllowed))
    && safeMarketingReferrer(request.headers.get("referer") ?? "", process.env.UNIFIED_WEB_ORIGIN || request.nextUrl.origin);
  const gaAllowed=(permitsAnalytics(consent,request.nextUrl)||(consent?.analytics===true&&receiptAllowed))&&safeMarketingReferrer(request.headers.get("referer")??"",process.env.UNIFIED_WEB_ORIGIN||request.nextUrl.origin);
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, Boolean(metaAllowed), gaAllowed);
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

  if (!(consent?.marketing||consent?.analytics) || !consent.adult) {
    for (const c of request.cookies.getAll()) if(c.name.startsWith(INTENT_PREFIX)||c.name.startsWith(RECEIPT_PREFIX)) response.cookies.set(c.name, "", cookieOptions(request, 0));
  }
  return response;
}

export const config = {
  // Keep auth endpoints out of the session-refresh pass: they manage their
  // own cookies during the same request.
  matcher: ["/:path*"],
};
