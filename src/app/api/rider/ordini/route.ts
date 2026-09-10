import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

const ACTIVE_RIDER_STATUSES = ["CONFIRMED", "READY", "OUT"] as const;

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const rider = await prisma.rider.findFirst({
    where: { authUserId: user.id, active: true },
  });

  if (!rider) {
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const orders = await prisma.order.findMany({
    where: {
      riderId: rider.id,
      OR: [
        {
          status: { in: [...ACTIVE_RIDER_STATUSES] },
          OR: [
            { pickupTime: { gte: todayStart } },
            { pickupTime: null, createdAt: { gte: todayStart } },
          ],
        },
        {
          status: "DELIVERED",
          OR: [
            { actualTime: { gte: todayStart } },
            { actualTime: null, updatedAt: { gte: todayStart } },
          ],
        },
      ],
    },
    orderBy: [{ pickupTime: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      orderNumber: true,
      orderCode: true,
      type: true,
      status: true,
      deliveryStatus: true,
      address: true,
      addressDetail: true,
      deliveryZone: true,
      customerName: true,
      customerPhone: true,
      estimatedTime: true,
      actualTime: true,
      pickupTime: true,
      total: true,
      notes: true,
      riderId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(orders, { headers: { "Cache-Control": "private, no-store" } });
}
