import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

const feedbackSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  foodRating: z.number().int().min(1).max(5).optional(),
  serviceRating: z.number().int().min(1).max(5).optional(),
  deliveryRating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(2000).optional(),
});

async function findRequest(token: string) {
  return prisma.feedbackRequest.findUnique({
    where: { token },
    include: { order: { select: { orderNumber: true } }, feedback: true },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = await rateLimit(`feedback-read:${getClientIp(request.headers)}`, 30, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const { token } = await params;
  const feedbackRequest = await findRequest(token);
  if (!feedbackRequest) return NextResponse.json({ error: "Link non valido" }, { status: 404 });

  return NextResponse.json({
    orderNumber: feedbackRequest.order.orderNumber,
    submitted: Boolean(feedbackRequest.feedback),
    expired: feedbackRequest.expiresAt <= new Date(),
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const limit = await rateLimit(`feedback-submit:${getClientIp(request.headers)}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Troppe richieste" }, { status: 429 });

  const { token } = await params;
  const feedbackRequest = await findRequest(token);
  if (!feedbackRequest) return NextResponse.json({ error: "Link non valido" }, { status: 404 });
  if (feedbackRequest.expiresAt <= new Date()) return NextResponse.json({ error: "Link scaduto" }, { status: 410 });
  if (feedbackRequest.feedback) return NextResponse.json({ error: "Feedback già inviato" }, { status: 409 });

  const parsed = feedbackSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Valutazione non valida" }, { status: 400 });

  try {
    await prisma.orderFeedback.create({
      data: {
        requestId: feedbackRequest.id,
        orderId: feedbackRequest.orderId,
        ...parsed.data,
      },
    });
  } catch {
    return NextResponse.json({ error: "Feedback già inviato" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, positive: parsed.data.overallRating >= 4 });
}
