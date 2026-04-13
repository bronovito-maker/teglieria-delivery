import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const date = searchParams.get("date"); // YYYY-MM-DD

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      rider: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const body = await request.json();

  const order = await prisma.order.create({
    data: {
      type: body.type,
      channel: body.channel || "WEB",
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      address: body.address,
      addressDetail: body.addressDetail,
      deliveryZone: body.deliveryZone,
      deliveryKm: body.deliveryKm,
      deliveryCost: body.deliveryCost,
      pickupTime: body.pickupTime ? new Date(body.pickupTime) : null,
      estimatedTime: body.estimatedTime ? new Date(body.estimatedTime) : null,
      subtotal: body.subtotal,
      total: body.total,
      notes: body.notes,
      items: {
        createMany: {
          data: body.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            variant: item.variant,
            additions: item.additions,
            removals: item.removals,
            notes: item.notes,
          })),
        },
      },
      statusHistory: {
        create: { status: "RECEIVED" },
      },
    },
    include: { items: true },
  });

  return NextResponse.json(order, { status: 201 });
}
