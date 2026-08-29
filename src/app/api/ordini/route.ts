import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { createOrderSchema, generateOrderCode, orderStatusSchema, orderTypeSchema, toNullableJson } from "@/lib/validation/orders";
import { createOrderStatusToken } from "@/lib/order-status-token";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin } from "@/lib/request-security";
import { getStripe, getStripeSiteUrl } from "@/lib/stripe";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const phone = searchParams.get("phone");
  const countOnly = searchParams.get("countOnly") === "1";

  const where: Prisma.OrderWhereInput = {};
  const parsedStatus = status ? orderStatusSchema.safeParse(status) : null;
  const parsedType = type ? orderTypeSchema.safeParse(type) : null;
  if (parsedStatus?.success) where.status = parsedStatus.data;
  if (parsedType?.success) where.type = parsedType.data;
  if (phone) where.customerPhone = phone;
  if (date) {
    const start = new Date(date);
    const end = new Date(date);
    end.setDate(end.getDate() + 1);
    where.createdAt = { gte: start, lt: end };
  }

  // Lightweight count-only query (used for repeat customer check) — public
  if (countOnly) {
    const count = await prisma.order.count({ where });
    return NextResponse.json({ count });
  }

  // Full order list requires admin auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      rider: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const sameOriginError = enforceSameOrigin(request);
  if (sameOriginError) return sameOriginError;

  const ip = getClientIp(request.headers);
  const limit = await rateLimit(`order-create:${ip}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json({ error: "Troppe richieste. Riprova tra poco." }, { status: 429 });
  }

  const parsed = createOrderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;
  const idempotencyKey = request.headers.get("idempotency-key")?.trim().slice(0, 100) || null;

  if (body.paymentMethod === "STRIPE" && !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagamento con carta temporaneamente non disponibile" }, { status: 503 });
  }

  const channel = body.channel || "WEB";
  const deliveryConfig = body.type === "DELIVERY" && channel === "WEB"
    ? await prisma.globalConfig.findUnique({ where: { id: "default" } })
    : null;
  const authoritativeDeliveryCost = body.type === "DELIVERY"
    ? channel === "WEB" ? Number(deliveryConfig?.deliveryFee ?? 2.5) : body.deliveryCost ?? 0
    : 0;

  // Leggi sessione opzionale — gli ordini guest hanno authUserId null
  let authUserId: string | null = null;
  let pricingAuthUserId: string | null = null;
  let isOperator = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;
    isOperator = Boolean(user && (role === "rider" || isOperatorUser(user)));
    if (user && !isOperator) {
      authUserId = user.id;
      pricingAuthUserId = user.id;
    }
  } catch {
    // Sessione non disponibile — procedi come guest
  }

  let order = idempotencyKey
    ? await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } })
    : null;
  let orderWasReused = Boolean(order);
  if (order && (
    order.type !== body.type ||
    order.paymentMethod !== (body.paymentMethod || "CONTANTI") ||
    order.customerPhone !== body.customerPhone
  )) {
    return NextResponse.json({ error: "Chiave idempotenza già associata a un altro ordine" }, { status: 409 });
  }
  try {
    if (!order) order = await prisma.$transaction(async (tx) => {
      // Validate product IDs exist to avoid FK violations (cart may have stale IDs after DB reset)
      const productIds = body.items.map((i) => i.productId).filter(Boolean);
      const existingProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        include: { variants: { where: { active: true } }, additions: { where: { active: true } } },
      });
      const validIds = new Set(existingProducts.map((p) => p.id));
      const stale = productIds.filter((id) => !validIds.has(id));
      if (stale.length > 0) {
        throw new Error("STALE_CART");
      }

      const productsById = new Map(existingProducts.map((product) => [product.id, product]));
      const authoritativeItems = body.items.map((item) => {
        const product = productsById.get(item.productId)!;
        const basePrice = pricingAuthUserId && product.clubPrice != null ? Number(product.clubPrice) : Number(product.price);
        const variant = item.variant ? product.variants.find((candidate) => candidate.name === item.variant) : null;
        if (item.variant && !variant) throw new Error("INVALID_CART_PRICE");
        const additions = item.additions ?? [];
        const authoritativeAdditions = additions.map((addition) => {
          const match = product.additions.find((candidate) => candidate.name === addition.name);
          if (!match) throw new Error("INVALID_CART_PRICE");
          return { name: match.name, price: Number(match.price) };
        });
        const expectedUnitPrice = basePrice + (variant ? Number(variant.priceDelta) : 0) + authoritativeAdditions.reduce((sum, addition) => sum + addition.price, 0);
        const priceMismatch = Math.abs(item.unitPrice - expectedUnitPrice) > 0.01 || Math.abs(item.totalPrice - expectedUnitPrice * item.quantity) > 0.01;
        if (priceMismatch && !pricingAuthUserId) {
          throw new Error("INVALID_CART_PRICE");
        }
        return { ...item, productName: product.name, unitPrice: expectedUnitPrice, totalPrice: expectedUnitPrice * item.quantity, additions: authoritativeAdditions };
      });
      const authoritativeSubtotal = authoritativeItems.reduce((sum, item) => sum + item.totalPrice, 0);
      const authoritativeTotal = authoritativeSubtotal + authoritativeDeliveryCost;

      const createdOrder = await tx.order.create({
        data: {
          authUserId,
          type: body.type,
          channel,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          customerEmail: body.customerEmail || null,
          address: body.address,
          addressDetail: body.addressDetail,
          deliveryZone: body.deliveryZone,
          deliveryKm: body.deliveryKm,
          deliveryCost: body.type === "DELIVERY" ? authoritativeDeliveryCost : null,
          pickupTime: body.pickupTime ? new Date(body.pickupTime) : null,
          timeSlot: body.timeSlot,
          estimatedTime: body.estimatedTime ? new Date(body.estimatedTime) : null,
          subtotal: authoritativeSubtotal,
          total: authoritativeTotal,
          notes: body.notes,
          paymentMethod: body.paymentMethod || "CONTANTI",
          idempotencyKey,
          items: {
            createMany: {
              data: authoritativeItems.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                variant: item.variant,
                additions: toNullableJson(item.additions),
                removals: toNullableJson(item.removals),
                notes: item.notes,
              })),
            },
          },
          statusHistory: {
            create: { status: "RECEIVED" },
          },
        },
        include: { items: true },
      });

      const orderCode = generateOrderCode(body.type, createdOrder.orderNumber);
      try {
        return await tx.order.update({
          where: { id: createdOrder.id },
          data: { orderCode },
          include: { items: true },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
          return tx.order.update({
            where: { id: createdOrder.id },
            data: { orderCode: generateOrderCode(body.type, createdOrder.orderNumber, createdOrder.id.slice(-4).toUpperCase()) },
            include: { items: true },
          });
        }
        throw err;
      }
    }); // end $transaction
  } catch (err) {
    console.error("[ORDINI POST]", err);
    if (idempotencyKey && err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      order = await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } });
      if (order) {
        orderWasReused = true;
        // Un'altra richiesta identica ha completato in parallelo: riusa l'ordine esistente.
      }
    }
    if (!order) {
    if (err instanceof Error && (err.message === "STALE_CART" || err.message === "INVALID_CART_PRICE")) {
      return NextResponse.json({ error: "Il menu è cambiato. Ricarica la pagina e riprova." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Errore nella creazione dell'ordine", detail: String(err) },
      { status: 500 }
    );
    }
  }

  if (order.customerEmail) {
    // Genera magic link solo per ordini guest (loggati hanno già l'account)
    let accountLink: string | null = null;
    if (!authUserId) {
      try {
        const adminClient = createAdminClient();
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const { data: linkData } = await adminClient.auth.admin.generateLink({
          type: "magiclink",
          email: order.customerEmail,
          options: {
            redirectTo: `${siteUrl}/api/auth/callback?type=customer&next=/account/orders`,
          },
        });
        accountLink = linkData?.properties?.action_link ?? null;
      } catch (err) {
        console.error("[MAGIC_LINK] Generazione fallita:", err);
      }
    }

    sendOrderConfirmationEmail({
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      orderNumber: order.orderNumber,
      type: order.type,
      items: order.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        totalPrice: Number(i.totalPrice),
        variant: i.variant,
      })),
      subtotal: Number(order.subtotal),
      total: Number(order.total),
      deliveryCost: order.deliveryCost ? Number(order.deliveryCost) : null,
      address: order.address,
      pickupTime: order.pickupTime,
      estimatedTime: order.estimatedTime,
      paymentMethod: order.paymentMethod,
      accountLink,
    }).catch((err) => console.error("[EMAIL] Conferma ordine fallita:", err));
  }

  let checkoutUrl: string | null = null;
  if (body.paymentMethod === "STRIPE") {
    try {
      if (orderWasReused && order.stripeSessionId) {
        const existingSession = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
        if (existingSession.status === "open" && existingSession.url) checkoutUrl = existingSession.url;
      }
      if (checkoutUrl) {
        return NextResponse.json({ ...order, checkoutUrl, statusAccessToken: createOrderStatusToken(order.id, order.createdAt) }, { status: 200 });
      }
      if (orderWasReused && order.paymentStatus === "FAILED") {
        await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING" } });
      }
      const siteUrl = getStripeSiteUrl(new URL(request.url).origin);
      const statusToken = createOrderStatusToken(order.id, order.createdAt);
      const session = await getStripe().checkout.sessions.create({
        mode: "payment",
        managed_payments: { enabled: false },
        customer_email: order.customerEmail || undefined,
        line_items: order.items.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(Number(item.unitPrice) * 100),
            product_data: {
              name: item.productName,
              metadata: { catalogProductId: item.productId },
            },
          },
        })),
        ...(order.deliveryCost && Number(order.deliveryCost) > 0
          ? {
              shipping_options: [{
                shipping_rate_data: {
                  type: "fixed_amount" as const,
                  fixed_amount: { amount: Math.round(Number(order.deliveryCost) * 100), currency: "eur" },
                  display_name: "Consegna",
                },
              }],
            }
          : {}),
        metadata: { orderId: order.id },
        payment_intent_data: { metadata: { orderId: order.id } },
        success_url: `${siteUrl}/stato-ordine/${order.id}?token=${encodeURIComponent(statusToken)}&payment=success`,
        cancel_url: `${siteUrl}/stato-ordine/${order.id}?token=${encodeURIComponent(statusToken)}&payment=cancelled`,
      });
      checkoutUrl = session.url;
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });
    } catch (error) {
      console.error("[STRIPE CHECKOUT] Creazione sessione fallita", error);
      return NextResponse.json({ error: "Impossibile avviare il pagamento con carta" }, { status: 502 });
    }
  }

  return NextResponse.json(
    {
      ...order,
      checkoutUrl,
      statusAccessToken: createOrderStatusToken(order.id, order.createdAt),
    },
    { status: 201 }
  );
}
