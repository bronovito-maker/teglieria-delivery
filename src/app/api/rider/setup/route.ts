import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRiderWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { authUserId, name, email, phone, checkOnly } = await request.json();

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

    const rider = await prisma.rider.update({
      where: { id: existing.id },
      data: { authUserId, phone: phone || existing.phone },
    });

    sendRiderWelcomeEmail({ email, name }).catch((err) =>
      console.error("[EMAIL] Rider welcome fallita:", err)
    );

    return NextResponse.json(rider);
  } catch (error) {
    console.error("Errore setup rider:", error);
    return NextResponse.json({ error: "Errore durante il setup del rider" }, { status: 500 });
  }
}
