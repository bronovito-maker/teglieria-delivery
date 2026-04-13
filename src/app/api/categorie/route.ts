import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const body = await request.json();
  const category = await prisma.category.create({
    data: {
      name: body.name,
      sortOrder: body.sortOrder ?? 0,
      active: body.active ?? true,
    },
  });
  return NextResponse.json(category, { status: 201 });
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const category = await prisma.category.update({
    where: { id: body.id },
    data: {
      name: body.name,
      sortOrder: body.sortOrder,
      active: body.active,
    },
  });
  return NextResponse.json(category);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
