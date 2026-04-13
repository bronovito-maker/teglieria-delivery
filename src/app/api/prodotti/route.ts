import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const products = await prisma.product.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      category: true,
      variants: true,
      additions: true,
      removals: true,
    },
  });
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const body = await request.json();
  const product = await prisma.product.create({
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      categoryId: body.categoryId,
      active: body.active ?? true,
      sortOrder: body.sortOrder ?? 0,
      kitchenNotes: body.kitchenNotes,
      variants: body.variants?.length
        ? { createMany: { data: body.variants } }
        : undefined,
      additions: body.additions?.length
        ? { createMany: { data: body.additions } }
        : undefined,
      removals: body.removals?.length
        ? { createMany: { data: body.removals } }
        : undefined,
    },
    include: {
      category: true,
      variants: true,
      additions: true,
      removals: true,
    },
  });
  return NextResponse.json(product, { status: 201 });
}
