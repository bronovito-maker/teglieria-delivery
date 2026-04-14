import { NextResponse } from "next/server";
import { sendCustomerWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();
    if (!email || !name) return NextResponse.json({ ok: false }, { status: 400 });
    await sendCustomerWelcomeEmail({ email, name });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
