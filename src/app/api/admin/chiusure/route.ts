import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { closureUpsertSchema } from "@/lib/validation/catalog";

export async function GET() {
  const closures = await prisma.closedDate.findMany({
    orderBy: { date: "asc" },
  });
  return NextResponse.json(closures);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const parsed = closureUpsertSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
  }

  const { date, reason } = parsed.data;

  const record = await prisma.closedDate.upsert({
    where: { date },
    create: { date, reason: reason || null },
    update: { reason: reason || null },
  });

  return NextResponse.json(record);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

  await prisma.closedDate.delete({ where: { date } });
  return NextResponse.json({ ok: true });
}
