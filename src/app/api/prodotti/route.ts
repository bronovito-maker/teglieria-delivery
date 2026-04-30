import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { productCreateSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";

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
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const parsed = productCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const product = await prisma.product.create({
    data: {
      name: body.name,
      description: body.description,
      price: body.price,
      imageUrl: body.imageUrl ?? null,
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
