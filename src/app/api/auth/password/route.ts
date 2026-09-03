import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const requestOrigin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  let sameOrigin = false;
  try {
    sameOrigin = Boolean(requestOrigin && new URL(requestOrigin).origin === requestUrl.origin);
  } catch {
    sameOrigin = false;
  }
  if (!sameOrigin) {
    return NextResponse.json(
      { error: "invalid_origin" },
      { status: 403, headers: { "Cache-Control": "private, no-store" } },
    );
  }

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
  const { error } = await supabase.auth.signInWithPassword({
    email: body.email.trim(),
    password: body.password,
  });

  if (error) {
    return NextResponse.json(
      { error: "invalid_credentials" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
