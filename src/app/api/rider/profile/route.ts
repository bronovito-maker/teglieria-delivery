import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const rider = await prisma.rider.findFirst({
    where: { authUserId: user.id, active: true },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      vehicle: true,
      zone: true,
      active: true,
    },
  });

  if (!rider) {
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });
  }

  return NextResponse.json(rider, { headers: { "Cache-Control": "private, no-store" } });
}
