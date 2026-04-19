import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus, RiderVehicle } from "@prisma/client";
import { sendRiderInviteEmail } from "@/lib/email";

const VALID_VEHICLES: RiderVehicle[] = ["BIKE", "SCOOTER", "CAR"];
import { calculateRiderCompensation } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const ACTIVE_ORDER_STATUSES: OrderStatus[] = ["CONFIRMED", "READY", "OUT"];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const riders = await prisma.rider.findMany({
    orderBy: { name: "asc" },
  });

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const payload = await Promise.all(
    riders.map(async (rider) => {
      const [activeOrders, deliveredAll, deliveredToday, recentDelivered] = await Promise.all([
        prisma.order.findMany({
          where: {
            riderId: rider.id,
            status: { in: ACTIVE_ORDER_STATUSES },
          },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
            timeSlot: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.order.findMany({
          where: {
            riderId: rider.id,
            status: "DELIVERED",
          },
          select: {
            total: true,
            items: {
              select: {
                quantity: true,
              },
            },
          },
        }),
        prisma.order.findMany({
          where: {
            riderId: rider.id,
            status: "DELIVERED",
            createdAt: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
          select: {
            total: true,
          },
        }),
        prisma.order.findMany({
          where: {
            riderId: rider.id,
            status: "DELIVERED",
            actualTime: { not: null },
          },
          select: { createdAt: true, actualTime: true },
          orderBy: { actualTime: "desc" },
          take: 20,
        }),
      ]);

      const deliveryDurations = recentDelivered
        .map((o) => (o.actualTime ? (o.actualTime.getTime() - o.createdAt.getTime()) / 60000 : null))
        .filter((v): v is number => v !== null && v > 0 && v < 240);
      const avgDeliveryMinutes = deliveryDurations.length > 0
        ? Math.round(deliveryDurations.reduce((a, b) => a + b, 0) / deliveryDurations.length)
        : null;

      const totalDeliveredRevenue = deliveredAll.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );
      const totalDeliveredPizzas = deliveredAll.reduce(
        (sum, order) => sum + order.items.reduce((itemsSum, item) => itemsSum + item.quantity, 0),
        0
      );
      const deliveredTodayRevenue = deliveredToday.reduce(
        (sum, order) => sum + Number(order.total),
        0
      );
      const deliveredCount = deliveredAll.length;
      const estimatedCompensation = calculateRiderCompensation(deliveredCount);
      const netAfterRiderCompensation = totalDeliveredRevenue - estimatedCompensation;

      return {
        ...rider,
        orders: activeOrders,
        metrics: {
          activeOrders: activeOrders.length,
          deliveredCount,
          deliveredTodayCount: deliveredToday.length,
          deliveredRevenue: totalDeliveredRevenue,
          deliveredTodayRevenue,
          totalPizzasDelivered: totalDeliveredPizzas,
          averageTicket: deliveredCount > 0 ? totalDeliveredRevenue / deliveredCount : 0,
          estimatedCompensation,
          netAfterRiderCompensation,
          avgDeliveryMinutes,
        },
      };
    })
  );

  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json();

    if (!body.name || typeof body.name !== "string" || body.name.trim().length < 2) {
      return NextResponse.json(
        { error: "Nome rider non valido" },
        { status: 400 }
      );
    }

    const vehicle: RiderVehicle = VALID_VEHICLES.includes(body.vehicle)
      ? body.vehicle
      : "SCOOTER";

    const rider = await prisma.rider.create({
      data: {
        name: body.name.trim(),
        email: typeof body.email === "string" && body.email.trim() ? body.email.trim() : null,
        phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : null,
        vehicle,
        zone: typeof body.zone === "string" && body.zone.trim() ? body.zone.trim() : null,
        active: true,
      },
    });

    writeAuditLog({
      action: "rider.create",
      entity: "rider",
      entityId: rider.id,
      actorEmail: user.email,
      actorId: user.id,
      metadata: { riderName: rider.name },
    });

    // Manda email di invito se il rider ha una email
    if (rider.email) {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.lateglieria.it";
      sendRiderInviteEmail({
        email: rider.email,
        name: rider.name,
        registerUrl: `${siteUrl}/rider/register`,
      }).catch((err) => console.error("[EMAIL] Rider invite fallita:", err));
    }

    return NextResponse.json(rider, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Impossibile creare il rider (email già in uso o dati non validi)" },
      { status: 400 }
    );
  }
}
