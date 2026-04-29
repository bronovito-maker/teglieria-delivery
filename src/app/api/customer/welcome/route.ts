import { NextResponse } from "next/server";
import { sendCustomerWelcomeEmail } from "@/lib/email";
import { captureError } from "@/lib/monitoring";
import { customerWelcomeSchema } from "@/lib/validation/catalog";

export async function POST(request: Request) {
  try {
    const parsed = customerWelcomeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Payload non valido" }, { status: 400 });
    }

    const { email, name } = parsed.data;
    await sendCustomerWelcomeEmail({ email, name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    captureError(err, { area: "api", route: "/api/customer/welcome", method: "POST" });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
