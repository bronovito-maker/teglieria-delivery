import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  let rider = await prisma.rider.findUnique({
    where: { authUserId: user.id },
  });

  // Fallback: cerca per email e lega authUserId se mancante
  if (!rider && user.email) {
    const byEmail = await prisma.rider.findFirst({
      where: { email: user.email, authUserId: null },
    });
    if (byEmail) {
      rider = await prisma.rider.update({
        where: { id: byEmail.id },
        data: { authUserId: user.id },
      });
    }
  }

  if (!rider) {
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });
  }

  return NextResponse.json(rider);
}
