import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { clubPromotionCreateSchema, clubPromotionPatchSchema } from "@/lib/validation/catalog";
import { enforceSameOrigin } from "@/lib/request-security";

const include = { items: { include: { product: { select: { id: true, name: true } } } } } as const;

async function operator(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user && (!isAdminRbacStrictEnabled() || isOperatorUser(user)) ? user : null;
}

export async function GET(request: Request) {
  const user = await operator(request);
  const now = new Date();
  const promotions = await prisma.clubPromotion.findMany({
    where: user ? undefined : { active: true, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
    include,
  });
  return NextResponse.json(promotions);
}

export async function POST(request: Request) {
  if (enforceSameOrigin(request)) return NextResponse.json({ error: "Origine non valida" }, { status: 403 });
  if (!await operator(request)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  const parsed = clubPromotionCreateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;
  const overlapping = await prisma.clubPromotion.count({ where: { active: true, startsAt: { lt: new Date(body.endsAt) }, endsAt: { gt: new Date(body.startsAt) } } });
  if (overlapping >= 2) return NextResponse.json({ error: "Sono già programmate due promo sovrapposte." }, { status: 409 });
  const promotion = await prisma.clubPromotion.create({
    data: { title: body.title, description: body.description, price: body.price, imageUrl: body.imageUrl ?? null, startsAt: new Date(body.startsAt), endsAt: new Date(body.endsAt), active: body.active ?? true, sortOrder: body.sortOrder ?? 0, items: { create: body.items } },
    include,
  });
  return NextResponse.json(promotion, { status: 201 });
}

export async function PATCH(request: Request) {
  if (enforceSameOrigin(request)) return NextResponse.json({ error: "Origine non valida" }, { status: 403 });
  if (!await operator(request)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  const parsed = clubPromotionPatchSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
  const { id, items, startsAt, endsAt, ...data } = parsed.data;
  if (startsAt || endsAt || data.active !== false) {
    const current = await prisma.clubPromotion.findUnique({ where: { id }, select: { startsAt: true, endsAt: true } });
    const rangeStart = startsAt ? new Date(startsAt) : current?.startsAt;
    const rangeEnd = endsAt ? new Date(endsAt) : current?.endsAt;
    if (rangeStart && rangeEnd) {
      const overlapping = await prisma.clubPromotion.count({ where: { id: { not: id }, active: true, startsAt: { lt: rangeEnd }, endsAt: { gt: rangeStart } } });
      if (overlapping >= 2) return NextResponse.json({ error: "Sono già programmate due promo sovrapposte." }, { status: 409 });
    }
  }
  const promotion = await prisma.$transaction(async (tx) => {
    if (items) await tx.clubPromotionItem.deleteMany({ where: { promotionId: id } });
    return tx.clubPromotion.update({ where: { id }, data: { ...data, ...(startsAt ? { startsAt: new Date(startsAt) } : {}), ...(endsAt ? { endsAt: new Date(endsAt) } : {}), ...(items ? { items: { create: items } } : {}) }, include });
  });
  return NextResponse.json(promotion);
}

export async function DELETE(request: Request) {
  if (enforceSameOrigin(request)) return NextResponse.json({ error: "Origine non valida" }, { status: 403 });
  if (!await operator(request)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID richiesto" }, { status: 400 });
  await prisma.clubPromotion.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
