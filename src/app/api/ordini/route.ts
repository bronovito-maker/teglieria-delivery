import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const type = searchParams.get("type");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const phone = searchParams.get("phone");
  const countOnly = searchParams.get("countOnly") === "1";

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
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

function generateOrderCode(type: string, count: number): string {
  const prefix = type === "DELIVERY" ? "D" : "A";
  // 1-999 → zero-padded 3 digits; 1000+ → natural width
  const num = count + 1;
  const padded = num < 1000 ? String(num).padStart(3, "0") : String(num);
  return `${prefix}${padded}`;
}

export async function POST(request: Request) {
  const body = await request.json();

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

  const order = await prisma.$transaction(async (tx) => {
    const count = await tx.order.count({ where: { type: body.type } });
    const orderCode = generateOrderCode(body.type, count);

    return tx.order.create({
      data: {
        orderCode,
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
          data: body.items.map((item: any) => ({
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            variant: item.variant,
            additions: item.additions,
            removals: item.removals,
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
  }); // end $transaction

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
