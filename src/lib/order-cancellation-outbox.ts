import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderCancellationEmail, type OrderCancellationInput } from "@/lib/email";

export const ORDER_CANCELLATION_EMAIL_EVENT = "ORDER_CANCELLED";

export async function enqueueOrderCancellationEmail(
  client: Prisma.TransactionClient,
  order: OrderCancellationInput & { id: string },
) {
  return client.orderEmailOutbox.upsert({
    where: {
      orderId_eventType: {
        orderId: order.id,
        eventType: ORDER_CANCELLATION_EMAIL_EVENT,
      },
    },
    update: {},
    create: {
      orderId: order.id,
      eventType: ORDER_CANCELLATION_EMAIL_EVENT,
      recipient: order.customerEmail,
      payload: order as unknown as Prisma.InputJsonValue,
    },
  });
}

export async function deliverOrderCancellationEmail(orderId: string): Promise<"sent" | "already-sent" | "busy" | "failed"> {
  const staleClaim = new Date(Date.now() - 5 * 60 * 1000);
  const claimed = await prisma.orderEmailOutbox.updateMany({
    where: {
      orderId,
      eventType: ORDER_CANCELLATION_EMAIL_EVENT,
      sentAt: null,
      OR: [{ claimedAt: null }, { claimedAt: { lt: staleClaim } }],
    },
    data: { claimedAt: new Date(), attempts: { increment: 1 }, lastError: null },
  });
  if (claimed.count === 0) {
    const existing = await prisma.orderEmailOutbox.findUnique({
      where: { orderId_eventType: { orderId, eventType: ORDER_CANCELLATION_EMAIL_EVENT } },
      select: { sentAt: true },
    });
    return existing?.sentAt ? "already-sent" : "busy";
  }

  const event = await prisma.orderEmailOutbox.findUniqueOrThrow({
    where: { orderId_eventType: { orderId, eventType: ORDER_CANCELLATION_EMAIL_EVENT } },
  });
  try {
    await sendOrderCancellationEmail(event.payload as unknown as OrderCancellationInput);
    await prisma.orderEmailOutbox.update({ where: { id: event.id }, data: { sentAt: new Date(), claimedAt: null } });
    return "sent";
  } catch (error) {
    await prisma.orderEmailOutbox.update({
      where: { id: event.id },
      data: { claimedAt: null, lastError: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) },
    });
    return "failed";
  }
}

export async function deliverPendingOrderCancellationEmails(limit = 50) {
  const pending = await prisma.orderEmailOutbox.findMany({
    where: { eventType: ORDER_CANCELLATION_EMAIL_EVENT, sentAt: null },
    select: { orderId: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const results = await Promise.all(pending.map((event) => deliverOrderCancellationEmail(event.orderId)));
  return {
    found: pending.length,
    sent: results.filter((result) => result === "sent").length,
    failed: results.filter((result) => result === "failed").length,
  };
}
