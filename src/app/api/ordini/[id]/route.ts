import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyCustomerOrderStatus } from "@/lib/customer-notifications";
import { sendRiderDepartedEmail, sendTimeUpdateEmail, sendOrderConfirmedEmail, sendOrderReadyEmail, sendOrderDeliveredEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { orderPatchSchema, type DeliveryStatusInput, type OrderPatchBody, type OrderStatusInput } from "@/lib/validation/orders";
import { verifyOrderStatusToken } from "@/lib/order-status-token";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin, safeEqual } from "@/lib/request-security";

function isRiderSafePatch(body: OrderPatchBody, riderId: string): boolean {
  const allowedStatuses = new Set(["OUT", "DELIVERED"]);
  const allowedDeliveryStatuses = new Set(["ASSIGNED", "EN_ROUTE", "DELIVERED"]);

  if (body.estimatedTime) return false;
  if (body.riderId !== undefined && body.riderId !== riderId) return false;
  if (body.status && !allowedStatuses.has(body.status)) return false;
  if (body.deliveryStatus && !allowedDeliveryStatuses.has(body.deliveryStatus)) return false;
  return true;
}

type TrackingOrder = {
  id: string;
  orderCode: string | null;
  orderNumber: number;
  type: string;
  status: string;
  address: string | null;
  estimatedTime: Date | null;
  actualTime: Date | null;
  total: unknown;
  items: unknown;
  rider: unknown;
  statusHistory: unknown;
  createdAt: Date;
  updatedAt: Date;
};

function toPublicTrackingOrder(order: TrackingOrder | null) {
  if (!order) return null;
  return {
    id: order.id,
    orderCode: order.orderCode,
    orderNumber: order.orderNumber,
    type: order.type,
    status: order.status,
    address: order.address,
    estimatedTime: order.estimatedTime,
    actualTime: order.actualTime,
    total: order.total,
    items: order.items,
    rider: order.rider,
    statusHistory: order.statusHistory,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
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
    },
  });
  if (!order)
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });

  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  if (token && verifyOrderStatusToken(token, id)) {
    return NextResponse.json(toPublicTrackingOrder(order));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const isOperator = !isAdminRbacStrictEnabled() || isOperatorUser(user);
  if (isOperator) return NextResponse.json(order);

  const isOwner =
    order.authUserId === user.id ||
    (Boolean(user.email) && order.customerEmail?.toLowerCase() === user.email!.toLowerCase());
  if (!isOwner) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  return NextResponse.json(order);
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
    select: { id: true, riderId: true },
  });

  if (!existingOrder) {
    return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  }

  const isOperator = !isAdminRbacStrictEnabled() || isOperatorUser(user);
  const rider = await prisma.rider.findFirst({
    where: {
      active: true,
      OR: [{ authUserId: user.id }, ...(user.email ? [{ email: user.email }] : [])],
    },
    select: { id: true },
  });
  const isAssignedRider =
    Boolean(rider) &&
    (existingOrder.riderId === rider!.id ||
      (existingOrder.riderId === null && body.riderId === rider!.id));

  if (!isOperator && (!rider || !isAssignedRider || !isRiderSafePatch(body, rider.id))) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const data: {
    status?: OrderStatusInput;
    riderId?: string | null;
    deliveryStatus?: DeliveryStatusInput;
    actualTime?: Date;
    estimatedTime?: Date;
  } = {};
  if (body.status) data.status = body.status;
  if (body.riderId !== undefined) data.riderId = body.riderId;
  if (body.deliveryStatus) data.deliveryStatus = body.deliveryStatus;
  if (body.actualTime) data.actualTime = new Date(body.actualTime);
  if (body.estimatedTime) data.estimatedTime = new Date(body.estimatedTime);

  const order = await prisma.order.update({
    where: { id },
    data,
    include: {
      items: true,
      rider: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  // Log status change and operational notes
  if (body.status || body.statusNote) {
    await prisma.orderStatusLog.create({
      data: {
        orderId: id,
        status: body.status || order.status,
        note: body.statusNote,
      },
    });
  }

  if (body.status) {
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
    }
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

  return NextResponse.json(order);
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
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!order) {
    return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });
  }

  let body: { adminPassword?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const deletePassword = process.env.ADMIN_ORDER_DELETE_PASSWORD;
  if (!deletePassword) {
    return NextResponse.json(
      { error: "Password eliminazione non configurata sul server" },
      { status: 500 }
    );
  }
  if (!body.adminPassword || !safeEqual(body.adminPassword, deletePassword)) {
    return NextResponse.json(
      { error: "Password amministratore non valida" },
      { status: 403 }
    );
  }

  await prisma.order.delete({
    where: { id },
  });

  writeAuditLog({
    action: "order.delete",
    entity: "order",
    entityId: id,
    actorEmail: user.email,
    actorId: user.id,
    metadata: {
      previousStatus: order.status,
      withPasswordCheck: true,
    },
  });

  return NextResponse.json({ success: true });
}
