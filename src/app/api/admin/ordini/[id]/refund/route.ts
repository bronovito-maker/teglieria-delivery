import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { enforceSameOrigin } from "@/lib/request-security";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`order-refund:${ip}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  if (order.paymentMethod !== "STRIPE" || !["PAID", "PARTIALLY_REFUNDED"].includes(order.paymentStatus)) {
    return NextResponse.json({ error: "L'ordine non è rimborsabile" }, { status: 409 });
  }

  let requestedAmount: number | null = null;
  try {
    const body = await request.json();
    if (body.amount !== undefined) {
      if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
        return NextResponse.json({ error: "Importo rimborso non valido" }, { status: 400 });
      }
      requestedAmount = Math.round(body.amount * 100);
    }
  } catch {
    // Nessun body = rimborso totale.
  }

  const totalCents = Math.round(Number(order.total) * 100);
  const remainingCents = totalCents - order.refundedAmountCents;
  const amount = requestedAmount ?? remainingCents;
  if (amount <= 0 || amount > remainingCents) {
    return NextResponse.json({ error: "Importo superiore al residuo rimborsabile" }, { status: 400 });
  }

  let paymentIntentId = order.stripePaymentIntentId;
  if (!paymentIntentId && order.stripeSessionId) {
    const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
    paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;
  }
  if (!paymentIntentId) return NextResponse.json({ error: "PaymentIntent Stripe non trovato" }, { status: 409 });

  const refundIdempotencyKey = `refund-${order.id}-${amount}`;
  const previousRefund = await prisma.paymentRefund.findUnique({ where: { idempotencyKey: refundIdempotencyKey } });
  if (previousRefund) return NextResponse.json(order);

  try {
    const refund = await getStripe().refunds.create(
      { payment_intent: paymentIntentId, amount, metadata: { orderId: order.id } },
      { idempotencyKey: refundIdempotencyKey },
    );
    const refundedAmountCents = Math.min(totalCents, order.refundedAmountCents + amount);
    const refundStatus = refund.status === "succeeded" ? "SUCCEEDED" : refund.status === "failed" ? "FAILED" : refund.status === "canceled" ? "CANCELED" : "PENDING";
    const updated = await prisma.$transaction(async (tx) => {
      await tx.paymentRefund.upsert({
        where: { stripeRefundId: refund.id },
        create: {
          orderId: order.id,
          stripeRefundId: refund.id,
          idempotencyKey: refundIdempotencyKey,
          amountCents: amount,
          status: refundStatus,
        },
        update: { status: refundStatus },
      });
      return tx.order.update({
        where: { id: order.id },
        data: {
          stripePaymentIntentId: paymentIntentId,
          stripeRefundId: refund.id,
          refundedAmountCents,
          paymentStatus: refundedAmountCents >= totalCents ? "REFUNDED" : "PARTIALLY_REFUNDED",
        },
      });
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[STRIPE REFUND] Fallito", error);
    return NextResponse.json({ error: "Rimborso Stripe non riuscito" }, { status: 502 });
  }
}
