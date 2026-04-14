import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendRiderWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { authUserId, name, email, phone } = await request.json();

    const rider = await prisma.rider.create({
      data: { authUserId, name, email, phone },
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
