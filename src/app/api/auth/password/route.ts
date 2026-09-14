import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin } from "@/lib/request-security";
import { linkUnclaimedOrdersToUser } from "@/lib/orders/link-user-orders";

export async function POST(request: Request) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`auth-password:${ip}`, 10, 60_000);

  if (!limit.ok) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 429, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  let body: { email?: unknown; password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (typeof body.email !== "string" || typeof body.password !== "string" || !body.email.trim() || !body.password) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (error) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  if (!data.user) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  await linkUnclaimedOrdersToUser(data.user);

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
