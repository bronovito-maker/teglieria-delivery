import { NextResponse } from "next/server";
import { deliverPendingOrderCancellationEmails } from "@/lib/order-cancellation-outbox";
import { safeEqual } from "@/lib/request-security";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ") || !safeEqual(authorization.slice(7), secret)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (!process.env.BREVO_API_KEY) {
    return NextResponse.json({ error: "Servizio email non configurato" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, ...(await deliverPendingOrderCancellationEmails()) });
}
