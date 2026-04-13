import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notifyCustomerOrderStatus } from "@/lib/customer-notifications";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: true,
      rider: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order)
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const body = await request.json();

  const data: any = {};
  if (body.status) data.status = body.status;
  if (body.riderId !== undefined) data.riderId = body.riderId;
  if (body.deliveryStatus) data.deliveryStatus = body.deliveryStatus;
  if (body.actualTime) data.actualTime = new Date(body.actualTime);
  if (body.estimatedTime) data.estimatedTime = new Date(body.estimatedTime);

  const order = await prisma.order.update({
    where: { id: params.id },
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
        orderId: params.id,
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
  { params }: { params: { id: string } }
) {
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
    where: { id: params.id },
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

  if (order.status === "CONFIRMED") {
    const deletePassword = process.env.ADMIN_ORDER_DELETE_PASSWORD;
    if (!deletePassword) {
      return NextResponse.json(
        { error: "Password eliminazione non configurata sul server" },
        { status: 500 }
      );
    }
    if (!body.adminPassword || body.adminPassword !== deletePassword) {
      return NextResponse.json(
        { error: "Password amministratore non valida" },
        { status: 403 }
      );
    }
  }

  await prisma.order.delete({
    where: { id: params.id },
  });

  writeAuditLog({
    action: "order.delete",
    entity: "order",
    entityId: params.id,
    actorEmail: user.email,
    actorId: user.id,
    metadata: {
      previousStatus: order.status,
      withPasswordCheck: order.status === "CONFIRMED",
    },
  });

  return NextResponse.json({ success: true });
}
