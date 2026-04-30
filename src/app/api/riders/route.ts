import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { sendRiderInviteEmail } from "@/lib/email";
import { calculateRiderCompensation } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { captureError } from "@/lib/monitoring";
import { riderCreateSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";

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
    const sameOriginError = enforceSameOrigin(request);
    if (sameOriginError) return sameOriginError;

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

    const parsed = riderCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const body = parsed.data;

    const rider = await prisma.rider.create({
      data: {
        name: body.name.trim(),
        email: body.email?.trim() || null,
        phone: body.phone?.trim() || null,
        vehicle: body.vehicle ?? "SCOOTER",
        zone: body.zone?.trim() || null,
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
      }).catch((err) => captureError(err, { area: "email", action: "rider.invite", riderId: rider.id }));
    }

    return NextResponse.json(rider, { status: 201 });
  } catch (err: unknown) {
    captureError(err, { area: "api", route: "/api/riders", method: "POST" });
    const isUniqueViolation =
      err instanceof Error && err.message.includes("Unique constraint");
    return NextResponse.json(
      {
        error: isUniqueViolation
          ? "Esiste già un rider con questa email."
          : "Impossibile creare il rider (dati non validi).",
      },
      { status: 400 }
    );
  }
}
