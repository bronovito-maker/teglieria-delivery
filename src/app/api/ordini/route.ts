import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";
import { createOrderSchema, generateOrderCode, orderStatusSchema, orderTypeSchema, toNullableJson } from "@/lib/validation/orders";

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
  const parsed = createOrderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Payload non valido", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const body = parsed.data;

  // Leggi sessione opzionale — gli ordini guest hanno authUserId null
  let authUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;
    if (user && role !== "admin" && role !== "rider") {
      authUserId = user.id;
    }
  } catch {
    // Sessione non disponibile — procedi come guest
  }

  let order;
  try {
    order = await prisma.$transaction(async (tx) => {
      // Validate product IDs exist to avoid FK violations (cart may have stale IDs after DB reset)
      const productIds = body.items.map((i) => i.productId).filter(Boolean);
      const existingProducts = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true },
      });
      const validIds = new Set(existingProducts.map((p) => p.id));
      const stale = productIds.filter((id) => !validIds.has(id));
      if (stale.length > 0) {
        throw new Error("STALE_CART");
      }

      const createdOrder = await tx.order.create({
        data: {
          authUserId,
          type: body.type,
          channel: body.channel || "WEB",
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          customerEmail: body.customerEmail || null,
          address: body.address,
          addressDetail: body.addressDetail,
          deliveryZone: body.deliveryZone,
          deliveryKm: body.deliveryKm,
          deliveryCost: body.deliveryCost,
          pickupTime: body.pickupTime ? new Date(body.pickupTime) : null,
          timeSlot: body.timeSlot,
          estimatedTime: body.estimatedTime ? new Date(body.estimatedTime) : null,
          subtotal: body.subtotal,
          total: body.total,
          notes: body.notes,
          paymentMethod: body.paymentMethod || "CONTANTI",
          items: {
            createMany: {
              data: body.items.map((item) => ({
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
    return NextResponse.json(
      { error: "Errore nella creazione dell'ordine", detail: String(err) },
      { status: 500 }
    );
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

  return NextResponse.json(order, { status: 201 });
}
