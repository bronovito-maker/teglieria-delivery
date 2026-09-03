import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";
import { markStripePaymentFailed, markStripePaymentSucceeded } from "@/lib/stripe-order-notifications";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    console.error("[STRIPE WEBHOOK] Secret mancante nell'ambiente runtime", {
      stripeKeyConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeMode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_test_") ? "test" : process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") ? "live" : "unknown",
      liveWebhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      testWebhookSecretConfigured: Boolean(process.env.STRIPE_TEST_WEBHOOK_SECRET),
    });
    return NextResponse.json({ error: "Webhook Stripe non configurato" }, { status: 503 });
  }
  if (!signature) {
    return NextResponse.json({ error: "Firma Stripe mancante" }, { status: 400 });
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
      const markedPaid = await markStripePaymentSucceeded({
        orderId,
        amountCents: session.amount_total,
        currency: session.currency,
        stripeSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
      });
      if (!markedPaid) {
        console.error("[STRIPE WEBHOOK] Pagamento sessione non applicato", {
          orderId,
          sessionId: session.id,
          amountTotal: session.amount_total,
          currency: session.currency,
        });
      }
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    if (orderId) {
      const markedPaid = await markStripePaymentSucceeded({
        orderId,
        amountCents: paymentIntent.amount_received,
        currency: paymentIntent.currency,
        stripePaymentIntentId: paymentIntent.id,
      });
      if (!markedPaid) {
        console.error("[STRIPE WEBHOOK] PaymentIntent non applicato", {
          orderId,
          paymentIntentId: paymentIntent.id,
          amountReceived: paymentIntent.amount_received,
          currency: paymentIntent.currency,
        });
      }
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const orderId = paymentIntent.metadata?.orderId;
    if (orderId) {
      await markStripePaymentFailed(orderId, paymentIntent.id);
    }
  }

  if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await markStripePaymentFailed(orderId);
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderId = session.metadata?.orderId;
    if (orderId) {
      await markStripePaymentFailed(orderId);
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
