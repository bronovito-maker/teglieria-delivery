import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { notifyCustomerOrderStatus } from "@/lib/customer-notifications";
import { sendRiderDepartedEmail, sendTimeUpdateEmail, sendOrderConfirmedEmail, sendOrderReadyEmail, sendOrderDeliveredEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser, isOperatorUser } from "@/lib/rbac";
import { canTransitionDeliveryStatus, canTransitionOrderStatus } from "@/lib/constants";
import { writeAuditLog } from "@/lib/audit";
import { orderPatchSchema, type DeliveryStatusInput, type OrderPatchBody, type OrderStatusInput } from "@/lib/validation/orders";
import { getOrderStatusCookieName, getOrderStatusTokenFromRequest, getOrderStatusTokenTtlSeconds, verifyOrderStatusToken } from "@/lib/order-status-token";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin } from "@/lib/request-security";
import { randomBytes } from "node:crypto";
import { getStripe } from "@/lib/stripe";
import { markStripePaymentSucceeded } from "@/lib/stripe-order-notifications";
import { toCustomerOrderView, toRiderOrderView } from "@/lib/order-views";
import { deliverOrderCancellationEmail, enqueueOrderCancellationEmail } from "@/lib/order-cancellation-outbox";
import { verifyAdminDeletionCredential } from "@/lib/admin-delete-verification";

function isRiderSafePatch(body: OrderPatchBody, riderId: string): boolean {
  const allowedStatuses = new Set(["OUT", "DELIVERED"]);
  const allowedDeliveryStatuses = new Set(["ASSIGNED", "EN_ROUTE", "DELIVERED"]);

  if (body.estimatedTime) return false;
  // Assignment is an operator-only action. A rider can update only the
  // delivery state of an order already assigned to their own profile.
  if (body.riderId !== undefined || !riderId) return false;
  if (body.status && !allowedStatuses.has(body.status)) return false;
  if (body.deliveryStatus && !allowedDeliveryStatuses.has(body.deliveryStatus)) return false;
  if (body.actualTime && body.status !== "DELIVERED") return false;
  return true;
}

type TrackingOrder = {
  id: string;
  orderCode: string | null;
  orderNumber: number;
  type: string;
  status: string;
  customerName: string;
  paymentMethod: string | null;
  paymentStatus: string;
  address: string | null;
  estimatedTime: Date | null;
  actualTime: Date | null;
  total: unknown;
  clubSavings: unknown;
  items: unknown;
  rider: unknown;
  statusHistory: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toPublicTrackingOrder(order: TrackingOrder | null) {
  if (!order) return null;
  const items = Array.isArray(order.items)
    ? order.items.map((item) => {
        const value = item as Record<string, unknown>;
        return {
          id: typeof value.id === "string" ? value.id : undefined,
          productName: typeof value.productName === "string" ? value.productName : "",
          quantity: typeof value.quantity === "number" ? value.quantity : 0,
          variant: typeof value.variant === "string" ? value.variant : null,
          additions: Array.isArray(value.additions) ? value.additions : [],
          removals: Array.isArray(value.removals) ? value.removals : [],
          ingredientSnapshot: Array.isArray(value.ingredientSnapshot)
            ? value.ingredientSnapshot.filter((ingredient): ingredient is string => typeof ingredient === "string")
            : [],
          notes: typeof value.notes === "string" ? value.notes : null,
        };
      })
    : [];
  const riderValue = order.rider as Record<string, unknown> | null;
  const statusHistory = Array.isArray(order.statusHistory)
    ? order.statusHistory.map((entry) => {
        const value = entry as Record<string, unknown>;
        return {
          id: typeof value.id === "string" ? value.id : undefined,
          status: typeof value.status === "string" ? value.status : "",
          createdAt: value.createdAt ?? null,
        };
      })
    : [];
  return {
    id: order.id,
    orderCode: order.orderCode,
    orderNumber: order.orderNumber,
    type: order.type,
    status: order.status,
    customerName: order.customerName,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    address: order.address,
    estimatedTime: order.estimatedTime,
    actualTime: order.actualTime,
    total: order.total,
    clubSavings: order.clubSavings,
    items,
    rider: riderValue && typeof riderValue.name === "string" ? { name: riderValue.name } : null,
    statusHistory,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

async function reconcilePaidStripeOrder(order: TrackingOrder & { stripeSessionId?: string | null; stripePaymentIntentId?: string | null }) {
  if (order.paymentMethod !== "STRIPE" || !["PENDING", "FAILED"].includes(order.paymentStatus) || !order.stripeSessionId) {
    return;
  }

  try {
    const session = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
    const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : null;

    if (session.payment_status !== "paid") {
      return;
    }

    const markedPaid = await markStripePaymentSucceeded({
      orderId: order.id,
      amountCents: session.amount_total,
      currency: session.currency,
      stripeSessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    });

    if (markedPaid) {
      Object.assign(order, {
        paymentStatus: "PAID",
        stripePaymentIntentId: paymentIntentId,
      });
      console.info("[STRIPE RECONCILIATION] Ordine marcato come pagato", { orderId: order.id, sessionId: session.id });
    }
  } catch (error) {
    // Il riepilogo ordine deve restare consultabile anche se Stripe è momentaneamente irraggiungibile.
    console.error("[STRIPE RECONCILIATION] Verifica pagamento fallita", { orderId: order.id, error });
  }
}

async function findActiveRiderForUser(user: { id: string; email?: string | null }) {
  return prisma.rider.findFirst({
    where: {
      active: true,
      authUserId: user.id,
    },
    select: { id: true },
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`order-read:${ip}`, 60, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      rider: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
      refunds: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order)
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const token = getOrderStatusTokenFromRequest(request);
  const cookieToken = (await cookies()).get(getOrderStatusCookieName(id))?.value ?? null;
  let validStatusToken: string | null = null;
  for (const candidate of [token, cookieToken]) {
    if (candidate && await verifyOrderStatusToken(candidate, id)) {
      validStatusToken = candidate;
      break;
    }
  }
  if (validStatusToken) {
    await reconcilePaidStripeOrder(order);
    const response = NextResponse.json(toPublicTrackingOrder(order), {
      headers: { "Cache-Control": "private, no-store" },
    });
    if (validStatusToken === token) {
      response.cookies.set(getOrderStatusCookieName(id), validStatusToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: `/api/ordini/${id}`,
        maxAge: getOrderStatusTokenTtlSeconds(),
      });
    }
    return response;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const isOperator = isOperatorUser(user);
  if (isOperator) {
    return NextResponse.json(order, { headers: { "Cache-Control": "private, no-store" } });
  }

  const rider = await findActiveRiderForUser(user);
  const isRiderVisibleOrder =
    Boolean(rider) &&
    order.type === "DELIVERY" &&
    order.riderId === rider!.id;
  if (isRiderVisibleOrder) {
    return NextResponse.json(toRiderOrderView(order), { headers: { "Cache-Control": "private, no-store" } });
  }

  const isOwner = order.authUserId === user.id;
  if (!isOwner) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  await reconcilePaidStripeOrder(order);
  return NextResponse.json(toCustomerOrderView(order), { headers: { "Cache-Control": "private, no-store" } });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`order-patch:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const parsed = orderPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const existingOrder = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      status: true,
      riderId: true,
      deliveryStatus: true,
      paymentMethod: true,
      paymentStatus: true,
      customerEmail: true,
      customerName: true,
      orderNumber: true,
      orderCode: true,
    },
  });

  if (!existingOrder) {
    return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  }

  if (
    body.status &&
    existingOrder.paymentMethod === "STRIPE" &&
    !["PAID", "PARTIALLY_REFUNDED"].includes(existingOrder.paymentStatus) &&
    body.status !== "CANCELLED"
  ) {
    return NextResponse.json({ error: "Ordine non pagato: impossibile avviarlo" }, { status: 409 });
  }

  const isOperator = isOperatorUser(user);
  const rider = await findActiveRiderForUser(user);
  const isAssignedRider =
    Boolean(rider) &&
    existingOrder.riderId === rider!.id;

  if (!isOperator && (!rider || !isAssignedRider || !isRiderSafePatch(body, rider.id))) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  if (!isOperator && existingOrder.type !== "DELIVERY") {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  if (isOperator && body.riderId) {
    if (existingOrder.type !== "DELIVERY") {
      return NextResponse.json({ error: "Solo gli ordini delivery possono avere un rider" }, { status: 409 });
    }
    const targetRider = await prisma.rider.findFirst({
      where: { id: body.riderId, active: true },
      select: { id: true },
    });
    if (!targetRider) {
      return NextResponse.json({ error: "Rider non disponibile" }, { status: 400 });
    }
  }

  const statusChanged = Boolean(body.status && body.status !== existingOrder.status);
  if (statusChanged && !canTransitionOrderStatus(existingOrder.type, existingOrder.status, body.status!)) {
    return NextResponse.json({ error: "Transizione di stato non consentita" }, { status: 409 });
  }

  if ((body.status === "CANCELLED" || body.riderId === null) && body.deliveryStatus) {
    return NextResponse.json({ error: "Un ordine annullato non può avere uno stato delivery attivo" }, { status: 409 });
  }

  if (body.deliveryStatus && (
    existingOrder.type !== "DELIVERY" ||
    !canTransitionDeliveryStatus(existingOrder.deliveryStatus, body.deliveryStatus)
  )) {
    return NextResponse.json({ error: "Transizione delivery non consentita" }, { status: 409 });
  }

  let effectiveDeliveryStatus: DeliveryStatusInput | null = body.deliveryStatus
    ?? existingOrder.deliveryStatus as DeliveryStatusInput | null;
  if (body.status === "OUT" && body.deliveryStatus === undefined) effectiveDeliveryStatus = "EN_ROUTE";
  if (body.status === "DELIVERED" && body.deliveryStatus === undefined) effectiveDeliveryStatus = "DELIVERED";
  if (isOperator && body.riderId && body.deliveryStatus === undefined && !effectiveDeliveryStatus) {
    effectiveDeliveryStatus = "ASSIGNED";
  }
  if (body.status === "CANCELLED" || body.riderId === null) effectiveDeliveryStatus = null;
  const effectiveOrderStatus = body.status ?? existingOrder.status;
  const effectiveRiderId = body.status === "CANCELLED"
    ? null
    : body.riderId !== undefined ? body.riderId : existingOrder.riderId;

  if (body.riderId === null && (
    existingOrder.status === "OUT" ||
    existingOrder.status === "DELIVERED" ||
    (existingOrder.deliveryStatus && existingOrder.deliveryStatus !== "ASSIGNED")
  )) {
    return NextResponse.json({ error: "Non è possibile disassociare una consegna già iniziata" }, { status: 409 });
  }

  if (effectiveDeliveryStatus && (
    existingOrder.type !== "DELIVERY" ||
    !canTransitionDeliveryStatus(existingOrder.deliveryStatus, effectiveDeliveryStatus)
  )) {
    return NextResponse.json({ error: "Stato delivery incoerente" }, { status: 409 });
  }

  if (existingOrder.type === "DELIVERY" && effectiveDeliveryStatus) {
    const stateIsCoherent = Boolean(effectiveRiderId) && (
      effectiveDeliveryStatus === "ASSIGNED"
        ? ["CONFIRMED", "PREPARING", "READY", "OUT"].includes(effectiveOrderStatus)
        : effectiveDeliveryStatus === "PICKED_UP" || effectiveDeliveryStatus === "EN_ROUTE"
          ? effectiveOrderStatus === "OUT"
          : effectiveDeliveryStatus === "DELIVERED" && effectiveOrderStatus === "DELIVERED"
    );
    if (!stateIsCoherent) {
      return NextResponse.json({ error: "Stato ordine e delivery incoerenti" }, { status: 409 });
    }
  }

  if (
    existingOrder.type === "DELIVERY" &&
    body.status === "DELIVERED" &&
    effectiveDeliveryStatus !== "DELIVERED"
  ) {
    return NextResponse.json({ error: "Una consegna deve risultare consegnata" }, { status: 409 });
  }

  if (existingOrder.type === "DELIVERY" && body.status === "OUT" && !effectiveDeliveryStatus) {
    return NextResponse.json({ error: "Stato delivery mancante" }, { status: 409 });
  }

  const data: {
    status?: OrderStatusInput;
    riderId?: string | null;
    deliveryStatus?: DeliveryStatusInput | null;
    actualTime?: Date;
    estimatedTime?: Date;
  } = {};
  if (body.status) data.status = body.status;
  if (body.riderId !== undefined && isOperator) data.riderId = body.riderId;
  if (effectiveDeliveryStatus || body.status === "CANCELLED" || body.riderId === null) {
    data.deliveryStatus = effectiveDeliveryStatus;
  }
  if (body.status === "CANCELLED" && isOperator && existingOrder.riderId !== null) {
    data.riderId = null;
  }
  if (body.actualTime) data.actualTime = new Date(body.actualTime);
  if (body.estimatedTime) data.estimatedTime = new Date(body.estimatedTime);

  const updateWhere = {
    id,
    status: existingOrder.status,
    ...(!isOperator ? { riderId: rider!.id } : {}),
  };
  let cancellationLogCreated = false;
  if (body.status === "CANCELLED" && statusChanged) {
    const committed = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({ where: updateWhere, data });
      if (updated.count !== 1) return false;
      await tx.orderStatusLog.create({
        data: { orderId: id, status: "CANCELLED", note: body.statusNote },
      });
      if (existingOrder.customerEmail) {
        await enqueueOrderCancellationEmail(tx, {
          id,
          customerEmail: existingOrder.customerEmail,
          customerName: existingOrder.customerName,
          orderNumber: existingOrder.orderNumber,
          orderCode: existingOrder.orderCode,
        });
      }
      return true;
    });
    if (!committed) return NextResponse.json({ error: "Ordine modificato da un'altra richiesta" }, { status: 409 });
    cancellationLogCreated = true;
  } else if (Object.keys(data).length > 0) {
    const updated = await prisma.order.updateMany({ where: updateWhere, data });
    if (updated.count !== 1) return NextResponse.json({ error: "Ordine modificato da un'altra richiesta" }, { status: 409 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: true,
      rider: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });

  // Log status change and operational notes
  if ((statusChanged || body.statusNote) && !cancellationLogCreated) {
    await prisma.orderStatusLog.create({
      data: {
        orderId: id,
        status: body.status || order.status,
        note: body.statusNote,
      },
    });
  }

  if (statusChanged) {
    await notifyCustomerOrderStatus({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      estimatedTime: order.estimatedTime,
      actualTime: order.actualTime,
      rider: order.rider,
    });

    if (body.status === "CONFIRMED" && order.customerEmail) {
      sendOrderConfirmedEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        type: order.type,
        estimatedTime: order.estimatedTime,
        address: order.address,
      }).catch((err) => console.error("[EMAIL] Ordine confermato fallita:", err));
    }

    // READY: per ASPORTO manda "vieni a ritirare", per DELIVERY non serve (l'utente aspetta il rider)
    if (body.status === "READY" && order.type === "ASPORTO" && order.customerEmail) {
      sendOrderReadyEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        estimatedTime: order.estimatedTime,
      }).catch((err) => console.error("[EMAIL] Ordine pronto fallita:", err));
    }

    // OUT: solo DELIVERY
    if (body.status === "OUT" && order.customerEmail) {
      sendRiderDepartedEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        riderName: order.rider?.name,
        estimatedTime: order.estimatedTime,
        address: order.address,
      }).catch((err) => console.error("[EMAIL] Rider partito fallita:", err));
    }

    // DELIVERED: email di completamento per tutti
    if (body.status === "DELIVERED" && order.customerEmail) {
      sendOrderDeliveredEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        type: order.type,
      }).catch((err) => console.error("[EMAIL] Ordine completato fallita:", err));

      const now = new Date();
      const scheduledAt = new Date(now.getTime() + 90 * 60 * 1000);
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      await prisma.feedbackRequest.upsert({
        where: { orderId: order.id },
        update: {},
        create: {
          orderId: order.id,
          token: randomBytes(24).toString("hex"),
          scheduledAt,
          expiresAt,
        },
      });
      // L'invio è ritardato: il cliente riceve la richiesta dopo aver avuto
      // il tempo di consumare l'ordine.
    }
  }

  let cancellationEmail: string | null = null;
  if (body.status === "CANCELLED" && order.customerEmail) {
    cancellationEmail = await deliverOrderCancellationEmail(order.id);
  }

  // Notifica email su aggiornamento orario (solo se ordine attivo e cliente ha email)
  if (body.estimatedTime && !body.status && order.customerEmail) {
    const activeStatuses = ["RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT"];
    if (activeStatuses.includes(order.status)) {
      sendTimeUpdateEmail({
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        orderNumber: order.orderNumber,
        newEstimatedTime: order.estimatedTime!,
      }).catch((err) => console.error("[EMAIL] Time update fallita:", err));
    }
  }

  if (body.status || body.riderId !== undefined || body.estimatedTime || body.actualTime || body.statusNote) {
    writeAuditLog({
      action: "order.update",
      entity: "order",
      entityId: order.id,
      actorEmail: user?.email || null,
      actorId: user?.id || null,
      metadata: {
        status: body.status ?? null,
        riderId: body.riderId ?? null,
        hasStatusNote: Boolean(body.statusNote),
      },
    });
  }

  return NextResponse.json(isOperator ? { ...order, cancellationEmail } : toRiderOrderView(order), {
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`order-delete:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (!isAdminUser(user)) {
    return NextResponse.json({ error: "Permessi Admin richiesti", code: "ADMIN_PERMISSION_REQUIRED" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, orderCode: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  }

  let body: { adminPassword?: string; confirmation?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const expectedConfirmation = order.orderCode ?? id;
  if (body.confirmation?.trim() !== expectedConfirmation) {
    return NextResponse.json({ error: "Conferma ordine non valida", code: "DELETE_CONFIRMATION_INVALID" }, { status: 400 });
  }
  const verification = await verifyAdminDeletionCredential({ auth: supabase.auth, user, credential: body.adminPassword });
  if (!verification.ok) {
    if (verification.code === "VERIFICATION_NOT_CONFIGURED") {
      return NextResponse.json({ error: "Verifica eliminazione non configurata sul server", code: verification.code }, { status: 503 });
    }
    const status = verification.code === "CREDENTIAL_REQUIRED" ? 400 : 401;
    return NextResponse.json({ error: verification.code === "CREDENTIAL_REQUIRED" ? "Credenziale richiesta" : "Credenziale amministratore non valida", code: verification.code }, { status });
  }

  await prisma.$transaction([
    prisma.auditEvent.create({
      data: {
        action: "order.delete",
        entity: "order",
        entityId: id,
        actorEmail: user.email,
        actorId: user.id,
        metadata: { previousStatus: order.status, verificationMethod: verification.method },
      },
    }),
    prisma.order.delete({ where: { id } }),
  ]);

  writeAuditLog({
    action: "order.delete",
    entity: "order",
    entityId: id,
    actorEmail: user.email,
    actorId: user.id,
    metadata: {
      previousStatus: order.status,
      verificationMethod: verification.method,
    },
  });

  return NextResponse.json({ success: true });
}
