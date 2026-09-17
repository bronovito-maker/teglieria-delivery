import { validBeverageChoice } from "@/lib/beverage-choice";
import { enqueueGestionaleOrder } from "@/lib/gestionale-bridge";
import { readRegistry } from "@/lib/allergens/server";
import { productResult, pizzaAllergens, snapshot } from "@/lib/allergens/core";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOperatorUser } from "@/lib/rbac";
import { createOrderSchema, generateOrderCode, orderStatusSchema, orderTypeSchema, toNullableJson } from "@/lib/validation/orders";
import { createOrderStatusToken } from "@/lib/order-status-token";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { enforceSameOrigin, getTrustedSiteOrigin } from "@/lib/request-security";
import { getStripe, getStripeErrorContext, getStripeSiteUrl } from "@/lib/stripe";
import { calculateDeliveryFee, getItalianTimeSlot, getRomeDayBounds, isOrderTimeAllowed, MIN_ORDER_SUBTOTAL } from "@/lib/constants";
import { calculateAuthoritativePizzaLine, parsePizzaBuilderSelection, type PizzaBuilderSelection } from "@/lib/pizza-builder";
import { toCustomerOrderView } from "@/lib/order-views";
import { getCanonicalProductIngredients } from "@/lib/catalog";
import { calculateAuthoritativeLine, calculateMoneySummary, fromCents, toCents } from "@/lib/money";
import { getServiceAvailability, serviceForOrderType } from "@/lib/service-availability";

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
    where.createdAt = getRomeDayBounds(date);
  }

  // Both full order lists and repeat-customer counts contain operational data
  // and require operator authorization.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (!isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  if (countOnly) {
    const count = await prisma.order.count({ where });
    return NextResponse.json({ count }, { headers: { "Cache-Control": "private, no-store" } });
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: true,
      rider: true,
      gestionaleOrder: { select: { backendOrderId: true, lastError: true, lastSyncedAt: true } },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
  return NextResponse.json(orders, { headers: { "Cache-Control": "private, no-store" } });
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
  const serviceConfig = await prisma.globalConfig.findUnique({ where: { id: "default" } });
  const requestedService = serviceForOrderType(body.type, getServiceAvailability(serviceConfig));
  if (!requestedService.active) {
    return NextResponse.json(
      { error: requestedService.label ?? "Servizio temporaneamente non disponibile", code: "SERVICE_DISABLED", disabledUntil: requestedService.disabledUntil },
      { status: 503 },
    );
  }
  const requestedTimeSlots = [
    body.timeSlot,
    body.pickupTime ? getItalianTimeSlot(body.pickupTime) : null,
  ].filter((time): time is string => Boolean(time));
  if (requestedTimeSlots.some((time) => !isOrderTimeAllowed(body.type, time))) {
    return NextResponse.json(
      {
        error: body.type === "DELIVERY"
          ? "Le consegne sono disponibili dalle 19:00 alle 22:00"
          : "I ritiri sono disponibili dalle 16:00",
      },
      { status: 400 },
    );
  }
  if (requestedTimeSlots.length === 2 && requestedTimeSlots[0] !== requestedTimeSlots[1]) {
    return NextResponse.json({ error: "La fascia richiesta non coincide con l'orario dell'ordine" }, { status: 400 });
  }
  const idempotencyKey = request.headers.get("idempotency-key")?.trim().slice(0, 100) || null;

  // Leggi sessione opzionale — gli ordini guest hanno authUserId null
  let authUserId: string | null = null;
  let pricingAuthUserId: string | null = null;
  let isOperator = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    isOperator = Boolean(user && isOperatorUser(user));
    if (user && !isOperator) {
      authUserId = user.id;
      pricingAuthUserId = user.id;
    }
  } catch {
    // Sessione non disponibile — procedi come guest
  }

  // Il checkout pubblico non può scegliere canali manuali o dichiarare un
  // pagamento POS: questi valori sono riservati agli operatori autenticati.
  const effectivePaymentMethod = !isOperator && body.paymentMethod === "POS"
    ? null
    : body.paymentMethod || "CONTANTI";
  if (!effectivePaymentMethod) {
    return NextResponse.json({ error: "Metodo di pagamento non disponibile online" }, { status: 400 });
  }
  if (effectivePaymentMethod === "STRIPE" && !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Pagamento con carta temporaneamente non disponibile" }, { status: 503 });
  }

  // Il costo delivery viene sempre calcolato dal server per gli ordini WEB.
  // Solo un operatore autenticato può creare ordini PHONE/COUNTER con un
  // importo inserito manualmente.
  const channel = isOperator ? body.channel || "WEB" : "WEB";
  const authoritativeDeliveryCost = body.type === "DELIVERY"
    ? channel === "WEB" ? calculateDeliveryFee(body.deliveryKm) : body.deliveryCost ?? 0
    : 0;
  const authoritativeDeliveryCostCents = toCents(authoritativeDeliveryCost);

  let order = idempotencyKey
    ? await prisma.order.findUnique({ where: { idempotencyKey }, include: { items: true } })
    : null;
  let orderWasReused = Boolean(order);
  if (order && (
    order.type !== body.type ||
    order.paymentMethod !== effectivePaymentMethod ||
    order.customerPhone !== body.customerPhone
  )) {
    return NextResponse.json({ error: "Chiave idempotenza già associata a un altro ordine" }, { status: 409 });
  }
  try {
    if (!order) order = await prisma.$transaction(async (tx) => {
      // Validate product IDs exist to avoid FK violations (cart may have stale IDs after DB reset)
      const productIds = body.items.map((i) => i.productId).filter(Boolean);
      const existingProducts = await tx.product.findMany({
        where: { id: { in: productIds }, active: true, category: { active: true } },
        include: {
          category: true,
          variants: { where: { active: true } },
          additions: { where: { active: true } },
          removals: { where: { active: true } },
        },
      });
      const validIds = new Set(existingProducts.map((p) => p.id));
      const stale = productIds.filter((id) => !validIds.has(id));
      if (stale.length > 0) {
        throw new Error("STALE_CART");
      }

      const productsById = new Map(existingProducts.map((product) => [product.id, product]));
      const requestedPizzaFlavorNames = new Set<string>();
      for (const item of body.items) {
        const product = productsById.get(item.productId)!;
        if (!product.configuration) continue;
        let selection: PizzaBuilderSelection;
        try { selection = parsePizzaBuilderSelection(item.variant || ""); } catch { throw new Error("INVALID_CART_PRICE"); }
        for (const slot of selection.slots) {
          if (slot && typeof slot.flavor === "string" && slot.flavor.trim()) requestedPizzaFlavorNames.add(slot.flavor);
        }
      }
      const validPizzaFlavorKeys = new Set<string>();
      if (requestedPizzaFlavorNames.size > 0) {
        const flavorProducts = await tx.product.findMany({
          where: {
            active: true,
            name: { in: [...requestedPizzaFlavorNames] },
            category: { name: { in: ["Teglie", "Mezze teglie"] } },
          },
          select: { name: true, category: { select: { name: true } } },
        });
        for (const flavorProduct of flavorProducts) {
          validPizzaFlavorKeys.add(`${flavorProduct.category.name}:${flavorProduct.name}`);
        }
      }
      const allergenRegistry = await readRegistry(tx);
      const authoritativeItems = body.items.map((item) => {
        const product = productsById.get(item.productId)!;
        if (product.configuration) {
          let selection: PizzaBuilderSelection;
          try { selection = parsePizzaBuilderSelection(item.variant || ""); } catch { throw new Error("INVALID_CART_PRICE"); }
          const flavorCategory = selection.format === "MEZZA" ? "Mezze teglie" : "Teglie";
          if (selection.slots.some((slot) => typeof slot?.flavor === "string" && slot.flavor.trim() && !validPizzaFlavorKeys.has(`${flavorCategory}:${slot.flavor}`))) {
            throw new Error("INVALID_CART_PRICE");
          }
          let authoritativePizza: ReturnType<typeof calculateAuthoritativePizzaLine>;
          try {
            authoritativePizza = calculateAuthoritativePizzaLine({
              selection,
              quantity: item.quantity,
              claimedUnitPrice: item.unitPrice,
              claimedTotalPrice: item.totalPrice,
            });
          } catch (error) { if (error instanceof Error && error.message === "PIZZA_INGREDIENT_UNAVAILABLE") throw error; throw new Error("INVALID_CART_PRICE"); }
          const { calculated, unitPriceCents, totalPriceCents } = authoritativePizza;
          return { ...item, allergenSnapshot: snapshot(allergenRegistry, pizzaAllergens(allergenRegistry.graph, selection)), ingredientSnapshot: null, productName: product.name, unitPrice: fromCents(unitPriceCents), standardUnitPrice: fromCents(unitPriceCents), totalPrice: fromCents(totalPriceCents), additions: calculated.additions, variant: JSON.stringify(selection) };
        }
        if (!validBeverageChoice(product.name, item.variant)) throw new Error("INVALID_CART_PRICE");
        const standardBasePriceCents = toCents(Number(product.price));
        const payableBasePriceCents = pricingAuthUserId && product.clubPrice != null
          ? toCents(Number(product.clubPrice))
          : standardBasePriceCents;
        const variant = item.variant ? product.variants.find((candidate) => candidate.name === item.variant) : null;
        if (item.variant && !variant) throw new Error("INVALID_CART_PRICE");
        const additions = item.additions ?? [];
        const authoritativeAdditions = additions.map((addition) => {
          const match = product.additions.find((candidate) => candidate.name === addition.name);
          if (!match) throw new Error("INVALID_CART_PRICE");
          return { name: match.name, price: Number(match.price) };
        });
        const linePricing = calculateAuthoritativeLine({
          quantity: item.quantity,
          payableBasePrice: fromCents(payableBasePriceCents),
          standardBasePrice: fromCents(standardBasePriceCents),
          variantPrice: variant ? Number(variant.priceDelta) : 0,
          additionPrices: authoritativeAdditions.map((addition) => addition.price),
        });
        const priceMismatch = toCents(item.unitPrice) !== linePricing.payableUnitCents || toCents(item.totalPrice) !== linePricing.totalCents;
        if (priceMismatch) throw new Error("INVALID_CART_PRICE");
        const canonicalIngredients = getCanonicalProductIngredients(product.category.name, product.name);
        if (canonicalIngredients && JSON.stringify(item.ingredients ?? []) !== JSON.stringify(canonicalIngredients)) {
          throw new Error("STALE_CART");
        }
        return { ...item, allergenSnapshot: snapshot(allergenRegistry, productResult(allergenRegistry.graph, product.id, authoritativeAdditions.map(a => a.name), (item.removals ?? []).map(r => r.name), item.variant)), ingredientSnapshot: canonicalIngredients, productName: product.name, unitPrice: linePricing.payableUnitPrice, standardUnitPrice: linePricing.standardUnitPrice, totalPrice: linePricing.totalPrice, additions: authoritativeAdditions };
      });
      const authoritativePricing = calculateMoneySummary(
        authoritativeItems.map((item) => ({ quantity: item.quantity, payableUnitPrice: item.unitPrice, standardUnitPrice: item.standardUnitPrice })),
        fromCents(authoritativeDeliveryCostCents),
      );
      if (authoritativePricing.subtotalCents < toCents(MIN_ORDER_SUBTOTAL)) throw new Error("MIN_ORDER_NOT_REACHED");

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
          deliveryCost: body.type === "DELIVERY" ? authoritativePricing.fees : null,
          pickupTime: body.pickupTime ? new Date(body.pickupTime) : null,
          timeSlot: body.timeSlot,
          estimatedTime: body.estimatedTime ? new Date(body.estimatedTime) : null,
          subtotal: authoritativePricing.subtotal,
          clubSavings: authoritativePricing.savings,
          total: authoritativePricing.total,
          notes: body.notes,
          paymentMethod: effectivePaymentMethod,
          idempotencyKey,
          items: {
            createMany: {
              data: authoritativeItems.map((item) => ({
                allergenSnapshot: item.allergenSnapshot as unknown as Prisma.InputJsonValue,
                ingredientSnapshot: item.ingredientSnapshot === null
                  ? Prisma.JsonNull
                  : item.ingredientSnapshot as Prisma.InputJsonValue,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                standardUnitPrice: item.standardUnitPrice,
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

      if (channel === "WEB") await enqueueGestionaleOrder(tx, createdOrder.id);
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
    if (err instanceof Error && err.message === "MIN_ORDER_NOT_REACHED") {
      return NextResponse.json({ error: `Il minimo ordine è ${MIN_ORDER_SUBTOTAL.toFixed(2)} euro, esclusa la consegna.` }, { status: 400 });
    }
    if (err instanceof Error && err.message === "PIZZA_INGREDIENT_UNAVAILABLE") {
      return NextResponse.json({ error: "I carciofi non sono disponibili. Modifica la composizione della pizza nel carrello.", code: "PIZZA_INGREDIENT_UNAVAILABLE" }, { status: 409 });
    }
    if (err instanceof Error && (err.message === "STALE_CART" || err.message === "INVALID_CART_PRICE")) {
      return NextResponse.json({ error: "Il menu è cambiato. Ricarica la pagina e riprova." }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Errore nella creazione dell'ordine", detail: String(err) },
      { status: 500 }
    );
    }
  }

  // Per Stripe l'ordine è solo pending finché il webhook non conferma il pagamento.
  // La conferma email viene inviata da lì, evitando di comunicare un ordine
  // pagato prima che il pagamento sia realmente riuscito.
  if (order.customerEmail && order.paymentMethod !== "STRIPE") {
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
        ingredients: Array.isArray(i.ingredientSnapshot)
          ? i.ingredientSnapshot.filter((ingredient): ingredient is string => typeof ingredient === "string")
          : [],
      })),
      subtotal: Number(order.subtotal),
      clubSavings: Number(order.clubSavings),
      total: Number(order.total),
      deliveryCost: order.deliveryCost ? Number(order.deliveryCost) : null,
      address: order.address,
      pickupTime: order.pickupTime,
      estimatedTime: order.estimatedTime,
      timeSlot: order.timeSlot,
      paymentMethod: order.paymentMethod,
      accountLink,
    }).catch((err) => console.error("[EMAIL] Conferma ordine fallita:", err));
  }

  let checkoutUrl: string | null = null;
  if (effectivePaymentMethod === "STRIPE") {
    try {
      if (orderWasReused && order.stripeSessionId) {
        const existingSession = await getStripe().checkout.sessions.retrieve(order.stripeSessionId);
        if (existingSession.status === "open" && existingSession.url) checkoutUrl = existingSession.url;
      }
      if (checkoutUrl) {
        return NextResponse.json({
          ...toCustomerOrderView(order),
          checkoutUrl,
          statusAccessToken: await createOrderStatusToken(order.id),
        }, { status: 200, headers: { "Cache-Control": "private, no-store" } });
      }
      if (orderWasReused && order.paymentStatus === "FAILED") {
        await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PENDING" } });
      }
      const siteUrl = getStripeSiteUrl(getTrustedSiteOrigin(request) ?? undefined);
      if (!siteUrl) {
        return NextResponse.json({ error: "URL del sito non configurato" }, { status: 500 });
      }
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
          ? {
              shipping_options: [{
                shipping_rate_data: {
                  type: "fixed_amount" as const,
                  fixed_amount: { amount: toCents(Number(order.deliveryCost)), currency: "eur" },
                  display_name: "Consegna",
                },
              }],
            }
          : {}),
        metadata: { orderId: order.id },
        payment_intent_data: { metadata: { orderId: order.id } },
        success_url: `${siteUrl}/stato-ordine/${order.id}#token=${encodeURIComponent(statusToken)}`,
        cancel_url: `${siteUrl}/stato-ordine/${order.id}#token=${encodeURIComponent(statusToken)}`,
      });
      checkoutUrl = session.url;
      await prisma.order.update({
        where: { id: order.id },
        data: { stripeSessionId: session.id },
      });
    } catch (error) {
      console.error("[STRIPE CHECKOUT] Creazione sessione fallita", getStripeErrorContext(error));
      return NextResponse.json({ error: "Impossibile avviare il pagamento con carta" }, { status: 502 });
    }
  }

  return NextResponse.json(
    {
      ...toCustomerOrderView(order),
      checkoutUrl,
      statusAccessToken: await createOrderStatusToken(order.id),
    },
    { status: 201, headers: { "Cache-Control": "private, no-store" } }
  );
}
