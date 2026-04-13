import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      category: true,
      variants: true,
      additions: true,
      removals: true,
    },
  });
  if (!product)
    return NextResponse.json({ error: "Non trovato" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();

  // Delete old sub-items and recreate
  await prisma.$transaction([
    prisma.productVariant.deleteMany({ where: { productId: params.id } }),
    prisma.productAddition.deleteMany({ where: { productId: params.id } }),
    prisma.productRemoval.deleteMany({ where: { productId: params.id } }),
  ]);

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      categoryId: body.categoryId,
      active: body.active,
      sortOrder: body.sortOrder,
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
  return NextResponse.json(product);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await prisma.product.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
