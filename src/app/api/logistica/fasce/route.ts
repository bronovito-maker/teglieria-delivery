import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateSlots(start: string, end: string, slotMinutes = 30): string[] {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const slots: string[] = [];
  let cur = sh * 60 + sm;
  const endTotal = eh * 60 + em;
  while (cur < endTotal) {
    slots.push(`${String(Math.floor(cur / 60)).padStart(2, "0")}:${String(cur % 60).padStart(2, "0")}`);
    cur += slotMinutes;
  }
  return slots;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date") || new Date().toISOString().split("T")[0];

  // 1. Global config (capacity)
  let config = await prisma.globalConfig.findFirst();
  if (!config) {
    config = await prisma.globalConfig.create({ data: { maxOrdersPerSlot: 5 } });
  }

  // 2. Check specific closure
  const closure = await prisma.closedDate.findUnique({ where: { date: dateStr } });
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
  const dayOfWeek = new Date(dateStr + "T12:00:00").getDay();
  const daySchedule = await prisma.daySchedule.findUnique({ where: { dayOfWeek } });

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
  if (daySchedule.lunchActive) {
    baseSlots.push(...generateSlots(daySchedule.lunchStart, daySchedule.lunchEnd));
  }
  if (daySchedule.dinnerActive) {
    baseSlots.push(...generateSlots(daySchedule.dinnerStart, daySchedule.dinnerEnd));
  }

  // 5. Filter past slots for today (+ 30 min buffer)
  // Use Italian timezone to avoid UTC offset issues on the server
  const nowItaly = new Date().toLocaleString("en-CA", { timeZone: "Europe/Rome", hour12: false }).replace(",", "");
  const todayItaly = nowItaly.split(" ")[0]; // "YYYY-MM-DD"
  const isToday = dateStr === todayItaly;
  const [italyH, italyM] = nowItaly.split(" ")[1].split(":").map(Number);
  const nowMinutes = italyH * 60 + italyM + 30;

  const filteredSlots = isToday
    ? baseSlots.filter((t) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m > nowMinutes;
      })
    : baseSlots;

  // 6. Get order counts per slot
  const orders = await prisma.order.groupBy({
    by: ["timeSlot"],
    where: {
      pickupTime: {
        gte: new Date(dateStr),
        lt: new Date(new Date(dateStr).getTime() + 86400000),
      },
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
    return {
      time,
      available: current < config!.maxOrdersPerSlot,
      remaining: config!.maxOrdersPerSlot - current,
    };
  });

  return NextResponse.json({ date: dateStr, slots, maxPerSlot: config.maxOrdersPerSlot });
}
