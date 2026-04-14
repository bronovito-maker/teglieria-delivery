import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const closures = await prisma.closedDate.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json(closures);
}

export async function POST(request: Request) {
  const { date, reason } = await request.json();
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  const record = await prisma.closedDate.upsert({
    where: { date },
    create: { date, reason: reason || null },
    update: { reason: reason || null },
  });

  return NextResponse.json(record);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  await prisma.closedDate.delete({ where: { date } });
  return NextResponse.json({ ok: true });
}
