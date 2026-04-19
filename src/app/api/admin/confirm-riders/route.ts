import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) {
    return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
  }

  const riders = await prisma.rider.findMany({
    where: { authUserId: { not: null } },
    select: { id: true, name: true, email: true, authUserId: true },
  });

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const results = await Promise.allSettled(
    riders.map((r) =>
      admin.auth.admin.updateUserById(r.authUserId!, { email_confirm: true })
    )
  );

  const confirmed = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  return NextResponse.json({
    total: riders.length,
    confirmed,
    failed,
    riders: riders.map((r, i) => ({
      name: r.name,
      email: r.email,
      ok: results[i].status === "fulfilled",
    })),
  });
}
