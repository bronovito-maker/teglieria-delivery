import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getTrustedSiteOrigin, sanitizeInternalPath } from "@/lib/request-security";
import { linkUnclaimedOrdersToUser } from "@/lib/orders/link-user-orders";

export async function GET(request: Request) {
  const origin = getTrustedSiteOrigin(request);
  if (!origin) {
    return NextResponse.json({ error: "Origine del sito non configurata" }, { status: 500 });
  }

  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`auth-callback:${ip}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.redirect(`${origin}/accedi`);
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const requestedNext = sanitizeInternalPath(searchParams.get("next"), "");
  const next = requestedNext === "/accedi" || requestedNext.startsWith("/accedi?") || requestedNext.startsWith("/accedi/")
    ? ""
    : requestedNext;
  const type = searchParams.get("type") ?? "admin"; // "admin" | "customer"

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const role = data.user?.app_metadata?.role;

      // Retroactive linking: collega ordini guest (authUserId null) all'account per email
      const isCustomer = type === "customer" || role === "customer" || (!role && type !== "admin");
      if (isCustomer && data.user) {
        await linkUnclaimedOrdersToUser(data.user);
      }

      if (next) return NextResponse.redirect(`${origin}${next}`);
      if (role === "customer" || type === "customer") return NextResponse.redirect(`${origin}/menu`);
      return NextResponse.redirect(`${origin}/admin/dashboard`);
    }
  }

  // Fallback based on type
  const fallback = type === "customer" ? "/accedi" : "/admin/login";
  return NextResponse.redirect(`${origin}${fallback}`);
}
