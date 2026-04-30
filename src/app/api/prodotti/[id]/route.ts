import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { productPatchSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const product = await prisma.product.findUnique({
    where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const parsed = productPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;

  const cleanupQueries = [];
  if (body.variants !== undefined) {
    cleanupQueries.push(prisma.productVariant.deleteMany({ where: { productId: id } }));
  }
  if (body.additions !== undefined) {
    cleanupQueries.push(prisma.productAddition.deleteMany({ where: { productId: id } }));
  }
  if (body.removals !== undefined) {
    cleanupQueries.push(prisma.productRemoval.deleteMany({ where: { productId: id } }));
  }
  if (cleanupQueries.length > 0) {
    await prisma.$transaction(cleanupQueries);
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      imageUrl: body.imageUrl !== undefined ? body.imageUrl : undefined,
      categoryId: body.categoryId,
      active: body.active,
      sortOrder: body.sortOrder,
      kitchenNotes: body.kitchenNotes,
      variants: body.variants !== undefined && body.variants.length > 0
        ? { createMany: { data: body.variants } }
        : undefined,
      additions: body.additions !== undefined && body.additions.length > 0
        ? { createMany: { data: body.additions } }
        : undefined,
      removals: body.removals !== undefined && body.removals.length > 0
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
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
