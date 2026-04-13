import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authUserId = searchParams.get("authUserId");

  if (!authUserId) {
    return NextResponse.json({ error: "Missing authUserId" }, { status: 400 });
  }

  // Find the rider first
  const rider = await prisma.rider.findUnique({
    where: { authUserId },
  });

  if (!rider) {
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });
  }

  // Fetch orders assigned to this rider or available orders (PRONTO)
  // For the dashboard, we focus on assigned ones that are not completed yet + completed today
  const orders = await prisma.order.findMany({
    where: {
      riderId: rider.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      rider: true,
    }
  });

  return NextResponse.json(orders);
}
