import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];
  
  // 1. Get global capacity (default to 5 if not set)
  let config = await prisma.globalConfig.findFirst();
  if (!config) {
    config = await prisma.globalConfig.create({ data: { maxOrdersPerSlot: 5 } });
  }

  // 2. Define standard slots (18:30 - 22:00 every 30m)
  const baseSlots = [
    "18:30", "19:00", "19:30", "20:00", 
    "20:30", "21:00", "21:30", "22:00"
  ];

  // 3. Get existing orders for this date and these slots
  const orders = await prisma.order.groupBy({
    by: ['timeSlot'],
    where: {
      pickupTime: {
        gte: new Date(dateStr),
        lt: new Date(new Date(dateStr).getTime() + 86400000)
      },
      status: { not: "CANCELLED" }
    },
    _count: { id: true }
  });

  const orderCounts: Record<string, number> = {};
  orders.forEach(o => {
    if (o.timeSlot) orderCounts[o.timeSlot] = o._count.id;
  });

  // 4. Build response with availability
  const slots = baseSlots.map(time => {
    const currentOrders = orderCounts[time] || 0;
    const available = currentOrders < config!.maxOrdersPerSlot;
    return {
      time,
      available,
      remaining: config!.maxOrdersPerSlot - currentOrders
    };
  });

  return NextResponse.json({
    date: dateStr,
    slots,
    maxPerSlot: config.maxOrdersPerSlot
  });
}
