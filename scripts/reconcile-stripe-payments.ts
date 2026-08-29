import Stripe from "stripe";
import { prisma } from "../src/lib/prisma";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) throw new Error("STRIPE_SECRET_KEY non configurata");
const stripe = new Stripe(secretKey);

async function main() {
  const orders = await prisma.order.findMany({
    where: { paymentMethod: "STRIPE", stripeSessionId: { not: null } },
    select: { id: true, total: true, paymentStatus: true, stripeSessionId: true, stripePaymentIntentId: true },
  });
  let paid = 0;
  let failed = 0;
  let mismatches = 0;

  for (const order of orders) {
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId!);
    const expectedAmount = Math.round(Number(order.total) * 100);
    if (session.amount_total !== expectedAmount) {
      mismatches += 1;
      console.error(`MISMATCH ${order.id}: DB=${expectedAmount} Stripe=${session.amount_total}`);
      continue;
    }
    if (session.payment_status === "paid") {
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: "PAID",
          stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : order.stripePaymentIntentId,
        },
      });
      paid += 1;
    } else if (session.status === "expired" && order.paymentStatus === "PENDING") {
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
      failed += 1;
    }
  }
  console.log(`Riconciliazione completata: ${orders.length} ordini, ${paid} pagati, ${failed} scaduti, ${mismatches} mismatch`);
  if (mismatches > 0) process.exitCode = 2;
}

main().catch((error) => {
  console.error("[STRIPE RECONCILIATION] Fallita", error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
