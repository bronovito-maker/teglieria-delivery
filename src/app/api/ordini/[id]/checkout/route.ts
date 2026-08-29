import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeSiteUrl } from "@/lib/stripe";
import { createOrderStatusToken, verifyOrderStatusToken } from "@/lib/order-status-token";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`order-checkout:${ip}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });

  const token = new URL(request.url).searchParams.get("token");
  let authorized = Boolean(token && verifyOrderStatusToken(token, id));
  if (!authorized) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    authorized = Boolean(user && (order.authUserId === user.id || user.email?.toLowerCase() === order.customerEmail?.toLowerCase()));
  }
  if (!authorized) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (order.paymentMethod !== "STRIPE" || ["PAID", "REFUNDED"].includes(order.paymentStatus)) {
    return NextResponse.json({ error: "Il pagamento non può essere riavviato" }, { status: 409 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagamento con carta temporaneamente non disponibile" }, { status: 503 });
  }

  try {
    const statusToken = createOrderStatusToken(order.id, order.createdAt);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: order.customerEmail || undefined,
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "eur",
          unit_amount: Math.round(Number(item.unitPrice) * 100),
          product_data: { name: item.productName },
          metadata: { catalogProductId: item.productId },
        },
      })),
      ...(order.deliveryCost && Number(order.deliveryCost) > 0
        ? { shipping_options: [{ shipping_rate_data: { type: "fixed_amount" as const, fixed_amount: { amount: Math.round(Number(order.deliveryCost) * 100), currency: "eur" }, display_name: "Consegna" } }] }
        : {}),
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      success_url: `${getStripeSiteUrl(new URL(request.url).origin)}/stato-ordine/${order.id}?token=${encodeURIComponent(statusToken)}&payment=success`,
      cancel_url: `${getStripeSiteUrl(new URL(request.url).origin)}/stato-ordine/${order.id}?token=${encodeURIComponent(statusToken)}&payment=cancelled`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id, paymentStatus: "PENDING" } });
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("[STRIPE RETRY] Creazione sessione fallita", error);
    return NextResponse.json({ error: "Impossibile riavviare il pagamento" }, { status: 502 });
  }
}
