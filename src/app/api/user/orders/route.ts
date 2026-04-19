import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type { UserOrder } from "@/components/account/orders/types";
import type { Order, OrderItem } from "@prisma/client";

export const dynamic = "force-dynamic";

type OrderWithItems = Order & { items: OrderItem[] };

function mapOrder(order: OrderWithItems): UserOrder {
  return {
    id: order.id,
    orderCode: order.orderCode ?? null,
    orderNumber: order.orderNumber,
    type: order.type as UserOrder["type"],
    status: order.status as UserOrder["status"],
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      price: Number(i.unitPrice),
    })),
    total: Number(order.total),
    subtotal: Number(order.subtotal),
    address: order.address ?? null,
    estimatedTime: order.estimatedTime?.toISOString() ?? null,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const orders = await prisma.order.findMany({
    where: { authUserId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { items: true },
  });

  return NextResponse.json(orders.map(mapOrder));
}
