// Owner-requested suspension, 18 September 2026. Set false to reopen.
export const SITE_MAINTENANCE = true;
export const MAINTENANCE_MESSAGE = "Sito in manutenzione. È possibile ordinare da asporto o delivery a questo numero: 0586 082992";

export function maintenanceOrderResponse(): Response | null {
  if (!SITE_MAINTENANCE) return null;
  return Response.json({ error: MAINTENANCE_MESSAGE, code: "SITE_MAINTENANCE" }, {
    status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "3600" },
  });
}

export function maintenancePageResponse(pathname: string): Response | null {
  // Keep operations and existing order tracking available during suspension.
  if (!SITE_MAINTENANCE || /^\/(api|admin|rider|stato-ordine|_next)(\/|$)/.test(pathname)
      || ["/privacy", "/cookie-policy", "/allergeni"].includes(pathname)) return null;
  return new Response(`<!doctype html>
<html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Sito in manutenzione | La Teglieria</title>
<style>html{color-scheme:light}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:24px;background:#faf6ef;color:#26241f;font-family:system-ui,sans-serif;text-align:center}main{max-width:640px;padding:48px 24px}.brand{font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#9b402a}h1{font-size:clamp(32px,7vw,52px);line-height:1.12;margin:28px 0 20px}p{font-size:20px;line-height:1.6}a{display:inline-block;margin-top:12px;padding:16px 28px;border-radius:12px;background:#9b402a;color:white;font-size:clamp(24px,6vw,32px);font-weight:700;text-decoration:none}a:focus-visible{outline:3px solid #26241f;outline-offset:5px}</style></head>
<body><main><div class="brand">La Teglieria</div><h1>Sito in manutenzione</h1><p>È possibile ordinare da asporto o delivery a questo numero:</p><a href="tel:+390586082992">0586 082992</a></main></body></html>`, {
    status: 503,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "3600", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'" },
  });
}
