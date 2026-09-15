import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Acknowledgment, canAdvanceStatus, statusFromBackend } from "./gestionale-bridge-contract";

// Called inside the order transaction: either the order and its queue entry
// both commit, or neither does. No HTTP call can delay the customer's checkout.
export async function enqueueGestionaleOrder(tx: Prisma.TransactionClient, orderId: string) {
  if (process.env.GESTIONALE_BRIDGE_ENABLED !== "true") return;
  await tx.gestionaleOrder.create({ data: { orderId, payloadVersion: 1 } });
}

export async function pollGestionaleOrders() {
  return prisma.$transaction(async tx => {
    const now = new Date();
    const pending = await tx.gestionaleOrder.findMany({
      where: { nextPollAt: { lte: now }, order: { OR: [
        { paymentMethod: "CONTANTI" },
        { paymentMethod: "STRIPE", paymentStatus: { in: ["PAID", "PARTIALLY_REFUNDED", "REFUNDED"] } },
        { gestionaleOrder: { backendOrderId: { not: null } } },
      ] } },
      orderBy: [{ nextPollAt: "asc" }, { orderId: "asc" }], take: 10,
      include: { order: { include: { items: { orderBy: { id: "asc" } } } } },
    });
    if (pending.length) await tx.gestionaleOrder.updateMany({
      where: { orderId: { in: pending.map(row => row.orderId) } },
      data: { nextPollAt: new Date(now.getTime() + 30_000) },
    });
    // Only the committed server snapshots are exported. Never recalculate menu
    // prices here and never export customer email, auth IDs or tracking tokens.
    return pending.map(({ order, backendOrderId, payloadVersion }) => ({
      id: order.id, backendOrderId, orderCode: order.orderCode,
      createdAt: order.createdAt, type: order.type, status: order.status,
      customerName: order.customerName, customerPhone: order.customerPhone,
      address: order.address, addressDetail: order.addressDetail,
      pickupTime: order.pickupTime, estimatedTime: order.estimatedTime, timeSlot: order.timeSlot,
      notes: order.notes, paymentMethod: order.paymentMethod, paymentStatus: order.paymentStatus,
      stripePaymentIntentId: order.stripePaymentIntentId, stripeSessionId: order.stripeSessionId,
      refundedAmountCents: order.refundedAmountCents, total: order.total,
      deliveryCost: order.deliveryCost, items: order.items.map(item => ({
        id: item.id, productId: item.productId, productName: item.productName,
        quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice,
        ...(payloadVersion >= 1 ? { standardUnitPrice: item.standardUnitPrice } : {}),
        variant: item.variant, additions: item.additions, removals: item.removals,
        notes: item.notes, ingredientSnapshot: item.ingredientSnapshot,
      })),
    }));
  });
}

export async function acknowledgeGestionaleOrder(state: Acknowledgment) {
  return prisma.$transaction(async tx => {
    // Serialize callbacks per order. A late response cannot regress status.
    await tx.$queryRaw`SELECT "orderId" FROM "GestionaleOrder" WHERE "orderId"=${state.orderId} FOR UPDATE`;
    const row = await tx.gestionaleOrder.findUnique({ where: { orderId: state.orderId }, include: { order: true } });
    if (!row) throw new Error("UNKNOWN_ORDER");
    if (row.backendOrderId && row.backendOrderId !== state.order_id) throw new Error("ORDER_ID_CONFLICT");
    if (row.backendVersion > state.row_version) return { ignored: true };
    const next = statusFromBackend(state);
    const status = canAdvanceStatus(row.order.status, next) ? next : row.order.status;
    // Stripe remains owned by its signed webhook. The Banco may confirm cash
    // only after its durable sale exists; this callback never charges a card.
    const cashPaid = row.order.paymentMethod === "CONTANTI" && state.payment_state === "PAID" && !!state.sale_id;
    if (status !== row.order.status || (cashPaid && row.order.paymentStatus === "PENDING")) {
      await tx.order.update({ where: { id: state.orderId }, data: {
        status,
        ...(cashPaid ? { paymentStatus: "PAID" as const } : {}),
        ...(status !== row.order.status ? { statusHistory: { create: { status } } } : {}),
      } });
    }
    await tx.gestionaleOrder.update({ where: { orderId: state.orderId }, data: {
      backendOrderId: state.order_id, backendVersion: state.row_version,
      backendState: state, lastSyncedAt: new Date(), lastError: null,
      nextPollAt: new Date(Date.now() + (["CANCELLED", "DELIVERED"].includes(status) ? 600_000 : 10_000)),
    } });
    return { acknowledged: true };
  });
}
