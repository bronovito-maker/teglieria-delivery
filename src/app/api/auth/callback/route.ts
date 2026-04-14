import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "";
  const type = searchParams.get("type") ?? "admin"; // "admin" | "customer"

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const role = data.user?.user_metadata?.role;

      // Se è un flusso customer OAuth e il ruolo non è ancora impostato, lo settiamo
      if (type === "customer" && !role) {
        await supabase.auth.updateUser({ data: { role: "customer" } });
      }

      if (next) return NextResponse.redirect(`${origin}${next}`);
      if (role === "customer" || type === "customer") return NextResponse.redirect(`${origin}/ordine`);
      return NextResponse.redirect(`${origin}/admin/dashboard`);
    }
  }

  // Fallback based on type
  const fallback = type === "customer" ? "/accedi" : "/admin/login";
  return NextResponse.redirect(`${origin}${fallback}`);
}
