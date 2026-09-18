import { maintenanceOrderResponse } from "@/lib/site-maintenance";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripeErrorContext, getStripeSiteUrl } from "@/lib/stripe";
import { toCents } from "@/lib/money";
import { createOrderStatusToken, getOrderStatusCookieName, getOrderStatusTokenFromRequest, verifyOrderStatusToken } from "@/lib/order-status-token";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin, getTrustedSiteOrigin } from "@/lib/request-security";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const maintenance = maintenanceOrderResponse();
  if (maintenance) return maintenance;
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;
  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`order-checkout:${ip}`, 10, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
  if (!order) return NextResponse.json({ error: "Ordine non trovato" }, { status: 404 });

  const token = getOrderStatusTokenFromRequest(request);
  const cookieToken = (await cookies()).get(getOrderStatusCookieName(id))?.value ?? null;
  let authorized = false;
  for (const candidate of [token, cookieToken]) {
    if (candidate && await verifyOrderStatusToken(candidate, id)) {
      authorized = true;
      break;
    }
  }
  if (!authorized) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    authorized = Boolean(user && order.authUserId === user.id);
  }
  if (!authorized) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (order.paymentMethod !== "STRIPE" || ["PAID", "REFUNDED"].includes(order.paymentStatus)) {
    return NextResponse.json({ error: "Il pagamento non può essere riavviato" }, { status: 409 });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagamento con carta temporaneamente non disponibile" }, { status: 503 });
  }
  const siteUrl = getStripeSiteUrl(getTrustedSiteOrigin(request) ?? undefined);
  if (!siteUrl) {
    return NextResponse.json({ error: "URL del sito non configurato" }, { status: 500 });
  }

  try {
    const statusToken = await createOrderStatusToken(order.id);
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      managed_payments: { enabled: false },
      customer_email: order.customerEmail || undefined,
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: "eur",
          unit_amount: toCents(Number(item.unitPrice)),
          product_data: {
            name: item.productName,
            metadata: { catalogProductId: item.productId },
          },
        },
      })),
      ...(order.deliveryCost && Number(order.deliveryCost) > 0
        ? { shipping_options: [{ shipping_rate_data: { type: "fixed_amount" as const, fixed_amount: { amount: toCents(Number(order.deliveryCost)), currency: "eur" }, display_name: "Consegna" } }] }
        : {}),
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id } },
      success_url: `${siteUrl}/stato-ordine/${order.id}#token=${encodeURIComponent(statusToken)}`,
      cancel_url: `${siteUrl}/stato-ordine/${order.id}#token=${encodeURIComponent(statusToken)}`,
    });
    await prisma.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id, paymentStatus: "PENDING" } });
    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("[STRIPE RETRY] Creazione sessione fallita", getStripeErrorContext(error));
    return NextResponse.json({ error: "Impossibile riavviare il pagamento" }, { status: 502 });
  }
}
