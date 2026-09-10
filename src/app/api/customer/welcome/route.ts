import { NextResponse } from "next/server";
import { sendCustomerWelcomeEmail } from "@/lib/email";
import { captureError } from "@/lib/monitoring";
import { customerWelcomeSchema } from "@/lib/validation/catalog";
import { createClient } from "@/lib/supabase/server";
import { enforceSameOrigin } from "@/lib/request-security";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const sameOriginError = enforceSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const limit = await rateLimit(`customer-welcome:${getClientIp(request.headers)}`, 3, 60_000);
    if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

    const parsed = customerWelcomeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Payload non valido" }, { status: 400 });
    }

    const { email, name } = parsed.data;
    if (email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
    await sendCustomerWelcomeEmail({ email, name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err, { area: "api", route: "/api/customer/welcome", method: "POST" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
