import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRiderWelcomeEmail } from "@/lib/email";
import { captureError } from "@/lib/monitoring";
import { riderSetupSchema } from "@/lib/validation/catalog";
import { createClient } from "@/lib/supabase/server";
import { enforceSameOrigin } from "@/lib/request-security";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const sameOriginError = enforceSameOrigin(request);
    if (sameOriginError) return sameOriginError;

    const limit = await rateLimit(`rider-setup:${getClientIp(request.headers)}`, 10, 60_000);
    if (!limit.ok) {
      return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Autenticazione richiesta" }, { status: 401 });
    }
    if (!user.email_confirmed_at) {
      return NextResponse.json({ error: "Verifica prima l'email dell'account" }, { status: 403 });
    }

    const parsed = riderSetupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { phone } = parsed.data;
    const email = user.email.trim().toLowerCase();

    // The authenticated email must match an active, pre-approved rider.
    // The identity is never accepted from the request body.
    const existing = await prisma.rider.findFirst({
      where: {
        active: true,
        authUserId: null,
        email: { equals: email, mode: "insensitive" },
      },
    });

    if (!existing) {
      const alreadyLinked = await prisma.rider.findFirst({ where: { authUserId: user.id, active: true } });
      if (alreadyLinked) return NextResponse.json(alreadyLinked, { headers: { "Cache-Control": "private, no-store" } });
      return NextResponse.json({ error: "Profilo rider non autorizzato" }, { status: 403 });
    }

    // Conditional update prevents two authenticated users from claiming the
    // same pre-approved rider concurrently.
    const linked = await prisma.rider.updateMany({
      where: {
        id: existing.id,
        active: true,
        authUserId: null,
        email: { equals: email, mode: "insensitive" },
      },
      data: { authUserId: user.id, phone: phone || existing.phone },
    });

    const rider = linked.count > 0
      ? await prisma.rider.findUniqueOrThrow({ where: { id: existing.id } })
      : await prisma.rider.findUnique({ where: { authUserId: user.id } });

    if (!rider || rider.id !== existing.id) {
      return NextResponse.json({ error: "Profilo rider già associato" }, { status: 409 });
    }

    sendRiderWelcomeEmail({ email, name: rider.name }).catch((err) =>
      captureError(err, { area: "email", action: "rider.welcome", riderId: rider.id })
    );

    return NextResponse.json(rider, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    captureError(error, { area: "api", route: "/api/rider/setup", method: "POST" });
    return NextResponse.json({ error: "Errore durante il setup del rider" }, { status: 500 });
  }
}
