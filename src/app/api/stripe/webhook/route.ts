import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = getStripeWebhookSecret();
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Webhook Stripe non configurato" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    console.error("[STRIPE WEBHOOK] Firma non valida", error);
    return NextResponse.json({ error: "Firma non valida" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId && session.payment_status === "paid") {
      const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true, paymentMethod: true } });
      const expectedAmount = order ? Math.round(Number(order.total) * 100) : null;
      if (!order || order.paymentMethod !== "STRIPE" || session.currency !== "eur" || session.amount_total !== expectedAmount) {
        console.error("[STRIPE WEBHOOK] Importo o valuta non corrispondenti", { orderId, expectedAmount, amountTotal: session.amount_total, currency: session.currency });
        return NextResponse.json({ received: true });
      }
      await prisma.order.updateMany({
        where: { id: orderId, paymentMethod: "STRIPE", paymentStatus: { not: "REFUNDED" } },
        data: {
          paymentStatus: "PAID",
          stripeSessionId: session.id,
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        },
      });
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    if (orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true, paymentMethod: true } });
      const expectedAmount = order ? Math.round(Number(order.total) * 100) : null;
      if (order?.paymentMethod === "STRIPE" && paymentIntent.currency === "eur" && paymentIntent.amount_received === expectedAmount) {
        await prisma.order.updateMany({
          where: { id: orderId, paymentMethod: "STRIPE", paymentStatus: { not: "REFUNDED" } },
          data: { paymentStatus: "PAID", stripePaymentIntentId: paymentIntent.id },
        });
      } else {
        console.error("[STRIPE WEBHOOK] PaymentIntent non corrispondente", { orderId, expectedAmount, received: paymentIntent.amount_received });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, paymentMethod: "STRIPE", paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED", stripePaymentIntentId: paymentIntent.id },
      });
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, paymentMethod: "STRIPE" },
        data: { paymentStatus: "FAILED" },
      });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId, paymentMethod: "STRIPE", paymentStatus: "PENDING" },
        data: { paymentStatus: "FAILED" },
      });
    }
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
    if (paymentIntentId) {
      const order = await prisma.order.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
      if (order) {
        const amountRefunded = charge.amount_refunded;
        const totalCents = Math.round(Number(order.total) * 100);
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: amountRefunded >= totalCents ? "REFUNDED" : "PARTIALLY_REFUNDED",
            refundedAmountCents: amountRefunded,
          },
        });
        for (const refund of charge.refunds?.data ?? []) {
          const status = refund.status === "succeeded" ? "SUCCEEDED" : refund.status === "failed" ? "FAILED" : refund.status === "canceled" ? "CANCELED" : "PENDING";
          await prisma.paymentRefund.upsert({
            where: { stripeRefundId: refund.id },
            create: { orderId: order.id, stripeRefundId: refund.id, idempotencyKey: `webhook-refund-${refund.id}`, amountCents: refund.amount, status },
            update: { status, amountCents: refund.amount },
          });
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
