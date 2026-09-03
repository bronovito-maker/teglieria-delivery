import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrderStatusToken } from "@/lib/order-status-token";
import { getStripeSiteUrl } from "@/lib/stripe";
import { sendOrderConfirmationEmail, sendOrderPaymentFailedEmail } from "@/lib/email";

type StripeOrderWithItems = Prisma.OrderGetPayload<{ include: { items: true } }>;

async function findStripeOrder(orderId: string): Promise<StripeOrderWithItems | null> {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
}

async function createGuestAccountLink(order: StripeOrderWithItems): Promise<string | null> {
  if (!order.customerEmail || order.authUserId) return null;

  const siteUrl = getStripeSiteUrl();
  if (!siteUrl) return null;

  try {
    const adminClient = createAdminClient();
    const { data } = await adminClient.auth.admin.generateLink({
      type: "magiclink",
      email: order.customerEmail,
      options: {
        redirectTo: `${siteUrl}/api/auth/callback?type=customer&next=/account/orders`,
      },
    });
    return data?.properties?.action_link ?? null;
  } catch (error) {
    console.error("[MAGIC_LINK] Generazione post-pagamento fallita", {
      orderId: order.id,
      error,
    });
    return null;
  }
}

function getTrackingUrl(order: StripeOrderWithItems): string | null {
  const siteUrl = getStripeSiteUrl();
  if (!siteUrl) return null;

  try {
    const token = createOrderStatusToken(order.id, order.createdAt);
    return `${siteUrl}/stato-ordine/${order.id}?token=${encodeURIComponent(token)}`;
  } catch (error) {
    console.error("[STRIPE EMAIL] Link tracking non generato", {
      orderId: order.id,
      error,
    });
    return null;
  }
}

async function sendPaidOrderConfirmation(orderId: string): Promise<void> {
  const order = await findStripeOrder(orderId);
  if (!order?.customerEmail) return;

  const accountLink = await createGuestAccountLink(order);
  await sendOrderConfirmationEmail({
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    type: order.type,
    items: order.items.map((item) => ({
      productName: item.productName,
      quantity: item.quantity,
      totalPrice: Number(item.totalPrice),
      variant: item.variant,
    })),
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    deliveryCost: order.deliveryCost == null ? null : Number(order.deliveryCost),
    address: order.address,
    pickupTime: order.pickupTime,
    estimatedTime: order.estimatedTime,
    paymentMethod: order.paymentMethod,
    paymentConfirmed: true,
    accountLink,
  });
}

async function sendFailedOrderPaymentEmail(orderId: string): Promise<void> {
  const order = await findStripeOrder(orderId);
  if (!order?.customerEmail) return;

  await sendOrderPaymentFailedEmail({
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    orderNumber: order.orderNumber,
    total: Number(order.total),
    retryUrl: getTrackingUrl(order),
  });
}

type StripePaymentProof = {
  orderId: string;
  amountCents: number | null;
  currency: string | null;
  stripeSessionId?: string | null;
  stripePaymentIntentId?: string | null;
};

/**
 * Marks a Stripe order as paid only after validating the amount and currency.
 * The PENDING/FAILED guard makes webhook retries idempotent and prevents a
 * duplicate paid confirmation email when Stripe sends both session and intent events.
 */
export async function markStripePaymentSucceeded(proof: StripePaymentProof): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: proof.orderId },
    select: { total: true, paymentMethod: true },
  });
  const expectedAmount = order ? Math.round(Number(order.total) * 100) : null;

  if (
    !order ||
    order.paymentMethod !== "STRIPE" ||
    proof.currency !== "eur" ||
    proof.amountCents !== expectedAmount
  ) {
    return false;
  }

  const result = await prisma.order.updateMany({
    where: {
      id: proof.orderId,
      paymentMethod: "STRIPE",
      paymentStatus: { in: ["PENDING", "FAILED"] },
      ...(proof.stripeSessionId ? { stripeSessionId: proof.stripeSessionId } : {}),
    },
    data: {
      paymentStatus: "PAID",
      ...(proof.stripeSessionId ? { stripeSessionId: proof.stripeSessionId } : {}),
      ...(proof.stripePaymentIntentId ? { stripePaymentIntentId: proof.stripePaymentIntentId } : {}),
    },
  });

  if (result.count === 0) return false;

  await sendPaidOrderConfirmation(proof.orderId);
  return true;
}

/** Marks a pending payment as failed once and sends the customer a retry email. */
export async function markStripePaymentFailed(orderId: string, paymentIntentId?: string | null): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: { id: orderId, paymentMethod: "STRIPE", paymentStatus: "PENDING" },
    data: {
      paymentStatus: "FAILED",
      ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
    },
  });

  if (result.count === 0) return false;

  await sendFailedOrderPaymentEmail(orderId);
  return true;
}
