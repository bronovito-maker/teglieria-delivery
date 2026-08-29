import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderFeedbackEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  if (!process.env.BREVO_API_KEY) {
    return NextResponse.json({ error: "Servizio email non configurato" }, { status: 503 });
  }

  const now = new Date();
  const requests = await prisma.feedbackRequest.findMany({
    where: {
      scheduledAt: { lte: now },
      sentAt: null,
      claimedAt: null,
      expiresAt: { gt: now },
      order: { status: "DELIVERED", customerEmail: { not: null } },
    },
    include: { order: true },
    orderBy: { scheduledAt: "asc" },
    take: 50,
  });

  let sent = 0;
  for (const feedbackRequest of requests) {
    const claimed = await prisma.feedbackRequest.updateMany({
      where: { id: feedbackRequest.id, sentAt: null, claimedAt: null },
      data: { claimedAt: now },
    });
    if (claimed.count !== 1 || !feedbackRequest.order.customerEmail) continue;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.lateglieria.it";
    const feedbackUrl = `${siteUrl}/feedback/${feedbackRequest.token}`;

    try {
      await sendOrderFeedbackEmail({
        customerEmail: feedbackRequest.order.customerEmail,
        customerName: feedbackRequest.order.customerName,
        orderNumber: feedbackRequest.order.orderNumber,
        feedbackUrl,
      });
      await prisma.feedbackRequest.update({
        where: { id: feedbackRequest.id },
        data: { sentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      await prisma.feedbackRequest.update({
        where: { id: feedbackRequest.id },
        data: { claimedAt: null },
      });
      console.error("[FEEDBACK][ERROR] Invio richiesta feedback:", error);
    }
  }

  return NextResponse.json({ ok: true, found: requests.length, sent });
}
