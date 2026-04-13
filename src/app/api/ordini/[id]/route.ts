import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

  // Log status change
  if (body.status) {
    await prisma.orderStatusLog.create({
      data: {
        orderId: params.id,
        status: body.status,
        note: body.statusNote,
      },
    });
  }

  return NextResponse.json(order);
}
