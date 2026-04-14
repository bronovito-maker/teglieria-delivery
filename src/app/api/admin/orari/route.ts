import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isOpen: false,
  lunchActive: false,
  lunchStart: "12:00",
  lunchEnd: "14:30",
  dinnerActive: false,
  dinnerStart: "18:30",
  dinnerEnd: "22:00",
}));

export async function GET() {
  const existing = await prisma.daySchedule.findMany({ orderBy: { dayOfWeek: "asc" } });

  // Ensure all 7 days exist
  const map = Object.fromEntries(existing.map((d) => [d.dayOfWeek, d]));
  const result = DEFAULTS.map((def) => map[def.dayOfWeek] ?? def);

  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const days: Array<{
    dayOfWeek: number;
    isOpen: boolean;
    lunchActive: boolean;
    lunchStart: string;
    lunchEnd: string;
    dinnerActive: boolean;
    dinnerStart: string;
    dinnerEnd: string;
  }> = await request.json();

  await Promise.all(
    days.map((day) =>
      prisma.daySchedule.upsert({
        where: { dayOfWeek: day.dayOfWeek },
        create: day,
        update: {
          isOpen: day.isOpen,
          lunchActive: day.lunchActive,
          lunchStart: day.lunchStart,
          lunchEnd: day.lunchEnd,
          dinnerActive: day.dinnerActive,
          dinnerStart: day.dinnerStart,
          dinnerEnd: day.dinnerEnd,
        },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
