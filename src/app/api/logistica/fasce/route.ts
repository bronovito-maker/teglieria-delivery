import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logisticsSlotsQuerySchema } from "@/lib/validation/catalog";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import {
  ASPORTO_START_TIME,
  buildOrderTimeSlot,
  DELIVERY_END_TIME,
  DELIVERY_START_TIME,
  generateOrderTimeSlots,
  getRomeDateString,
  getRomeDayBounds,
  getRomeDayOfWeek,
  getRomeTimeString,
} from "@/lib/constants";

export async function GET(request: Request) {
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`slots:${ip}`, 120, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const parsed = logisticsSlotsQuerySchema.safeParse(Object.fromEntries(searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ error: "Query non valida", issues: parsed.error.flatten() }, { status: 400 });
  }

  const dateStr = parsed.data.date || getRomeDateString();
  const orderType = parsed.data.type ?? "ASPORTO";

  // 1. Read config + schedule data
  let config = await prisma.globalConfig.findFirst();
  if (!config) config = await prisma.globalConfig.create({ data: { maxOrdersPerSlot: 5 } });

  const dayOfWeek = getRomeDayOfWeek(dateStr);
  const [closure, daySchedule] = await Promise.all([
    prisma.closedDate.findUnique({ where: { date: dateStr } }),
    prisma.daySchedule.findUnique({ where: { dayOfWeek } }),
  ]);

  // 2. Check specific closure
  if (closure) {
    return NextResponse.json({
      date: dateStr,
      slots: [],
      closed: true,
      reason: closure.reason,
      maxPerSlot: config.maxOrdersPerSlot,
    });
  }

  // 3. Day of week schedule (0=Sun...6=Sat)

  if (!daySchedule || !daySchedule.isOpen) {
    return NextResponse.json({
      date: dateStr,
      slots: [],
      closed: true,
      maxPerSlot: config.maxOrdersPerSlot,
    });
  }

  // 4. Generate slots from active services
  const baseSlots: string[] = [];
  if (orderType === "ASPORTO") {
    if (daySchedule.lunchActive) {
      baseSlots.push(...generateOrderTimeSlots("ASPORTO", daySchedule.lunchStart, daySchedule.lunchEnd).map((slot) => slot.time));
    }
    if (daySchedule.dinnerActive) {
      baseSlots.push(...generateOrderTimeSlots("ASPORTO", daySchedule.dinnerStart, daySchedule.dinnerEnd).map((slot) => slot.time));
    }
  } else if (daySchedule.dinnerActive) {
    const deliveryStart = daySchedule.dinnerStart > DELIVERY_START_TIME ? daySchedule.dinnerStart : DELIVERY_START_TIME;
    const deliveryEnd = daySchedule.dinnerEnd < DELIVERY_END_TIME ? daySchedule.dinnerEnd : DELIVERY_END_TIME;
    if (deliveryStart < deliveryEnd) {
      baseSlots.push(
        ...generateOrderTimeSlots("DELIVERY")
          .filter((slot) => slot.start >= deliveryStart && slot.end <= deliveryEnd)
          .map((slot) => slot.time),
      );
    }
  }
  const serviceStart = orderType === "DELIVERY" ? DELIVERY_START_TIME : ASPORTO_START_TIME;
  const serviceStartMinutes = Number(serviceStart.slice(0, 2)) * 60 + Number(serviceStart.slice(3));
  const serviceSlots = baseSlots.filter((time) => {
    const minutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
    return minutes >= serviceStartMinutes;
  });
  if (serviceSlots.length === 0) {
    return NextResponse.json({ date: dateStr, slots: [], closed: true, maxPerSlot: config.maxOrdersPerSlot });
  }

  // 5. Filter past slots for today (+ 30 min buffer)
  // Use Italian timezone to avoid UTC offset issues on the server
  const now = new Date();
  const todayItaly = getRomeDateString(now);
  const isToday = dateStr === todayItaly;
  const [italyH, italyM] = (getRomeTimeString(now) ?? "00:00").split(":").map(Number);
  const nowMinutes = italyH * 60 + italyM + 30;

  const filteredSlots = isToday
    ? serviceSlots.filter((t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m > nowMinutes;
      })
    : serviceSlots;

  if (filteredSlots.length === 0) {
    return NextResponse.json({ date: dateStr, slots: [], closed: true, maxPerSlot: config.maxOrdersPerSlot });
  }

  // 6. Get order counts per slot (only for currently relevant slots)
  const dayBounds = getRomeDayBounds(dateStr);
  const orders = await prisma.order.groupBy({
    by: ["timeSlot"],
    where: {
      timeSlot: { in: filteredSlots },
      pickupTime: dayBounds,
      status: { not: "CANCELLED" },
    },
    _count: { id: true },
  });

  const orderCounts: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.timeSlot) orderCounts[o.timeSlot] = o._count.id;
  });

  const slots = filteredSlots.map((time) => {
    const current = orderCounts[time] || 0;
    const sharedSlot = buildOrderTimeSlot(orderType, time);
    return {
      ...sharedSlot,
      available: current < config!.maxOrdersPerSlot,
      remaining: config!.maxOrdersPerSlot - current,
    };
  });

  return NextResponse.json({ date: dateStr, slots, maxPerSlot: config.maxOrdersPerSlot });
}
