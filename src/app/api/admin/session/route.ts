import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { hasAdminPanelAccess } from "@/lib/rbac";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, authorized: false }, { status: 401 });
  }

  const authorized = hasAdminPanelAccess(user);
  return NextResponse.json({
    authenticated: true,
    authorized,
    email: user.email ?? null,
  }, { status: authorized ? 200 : 403 });
}
