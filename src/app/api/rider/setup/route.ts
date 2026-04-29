import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRiderWelcomeEmail } from "@/lib/email";
import { createClient } from "@supabase/supabase-js";
import { captureError } from "@/lib/monitoring";
import { riderSetupSchema } from "@/lib/validation/catalog";

export async function POST(request: Request) {
  try {
    const parsed = riderSetupSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload non valido", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { authUserId, name, email, phone, checkOnly } = parsed.data;

    // Solo i rider pre-creati dall'admin possono completare la registrazione
    const existing = email
      ? await prisma.rider.findFirst({ where: { email } })
      : null;

    if (!existing) {
      return NextResponse.json(
        { error: "Email non autorizzata. Contatta lo staff de La Teglieria per essere aggiunto come rider." },
        { status: 403 }
      );
    }

    // checkOnly = verifica pre-registrazione senza modificare nulla
    if (checkOnly) {
      return NextResponse.json({ ok: true });
    }

    const setupAuthUserId = authUserId;
    if (!setupAuthUserId) {
      return NextResponse.json({ error: "authUserId richiesto" }, { status: 400 });
    }

    // Auto-conferma email Supabase — il rider è già stato verificato dal pre-approval
    // Senza questo il login fallisce finché non cliccano il link di conferma
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await adminClient.auth.admin.updateUserById(setupAuthUserId, {
      email_confirm: true,
    }).catch((err) => captureError(err, { area: "supabase", action: "rider.autoConfirm", email }));

    const rider = await prisma.rider.update({
      where: { id: existing.id },
      data: { authUserId: setupAuthUserId, phone: phone || existing.phone },
    });

    sendRiderWelcomeEmail({ email, name }).catch((err) =>
      captureError(err, { area: "email", action: "rider.welcome", riderId: rider.id })
    );

    return NextResponse.json(rider);
  } catch (error) {
    captureError(error, { area: "api", route: "/api/rider/setup", method: "POST" });
    return NextResponse.json({ error: "Errore durante il setup del rider" }, { status: 500 });
  }
}
