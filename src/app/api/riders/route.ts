import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ACTIVE_ORDER_STATUSES = ["CONFIRMED", "PREPARING", "READY", "OUT"];

export async function GET() {
  const riders = await prisma.rider.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      orders: {
        where: {
          status: {
            in: ACTIVE_ORDER_STATUSES,
          },
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  return NextResponse.json(riders);
}
