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

  let rider = await prisma.rider.findUnique({
    where: { authUserId: user.id },
  });

  // Fallback: se authUserId non è ancora collegato, cerca per email e lo lega
  if (!rider && user.email) {
    const byEmail = await prisma.rider.findFirst({
      where: { email: user.email, authUserId: null },
    });
    if (byEmail) {
      rider = await prisma.rider.update({
        where: { id: byEmail.id },
        data: { authUserId: user.id },
      });
    }
  }

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
    include: { rider: true },
  });

  return NextResponse.json(orders);
}
