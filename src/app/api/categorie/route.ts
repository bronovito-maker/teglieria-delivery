import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { categoryCreateSchema, categoryPatchSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const parsed = categoryCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
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
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const parsed = categoryPatchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
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
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
