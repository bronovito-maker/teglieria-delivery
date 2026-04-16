import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateRiderCompensation } from "@/lib/finance";
import { createClient } from "@/lib/supabase/server";
import { isAdminRbacStrictEnabled, isOperatorUser } from "@/lib/rbac";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  if (isAdminRbacStrictEnabled() && !isOperatorUser(user)) return NextResponse.json({ error: "Accesso negato" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];

  const start = new Date(date);
  const end = new Date(date);
  end.setDate(end.getDate() + 1);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      status: { not: "CANCELLED" },
    },
    include: { items: true },
  });

  const cancelled = await prisma.order.count({
    where: {
      createdAt: { gte: start, lt: end },
      status: "CANCELLED",
    },
  });

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
  const deliveryCompletedCount = orders.filter(
    (o) => o.type === "DELIVERY" && o.status === "DELIVERED"
  ).length;
  const riderCompensation = calculateRiderCompensation(deliveryCompletedCount);
  const netAfterRiderCompensation = totalRevenue - riderCompensation;

  // By type
  const asportoOrders = orders.filter((o) => o.type === "ASPORTO");
  const deliveryOrders = orders.filter((o) => o.type === "DELIVERY");

  // By channel
  const webOrders = orders.filter((o) => o.channel === "WEB");
  const phoneOrders = orders.filter((o) => o.channel === "PHONE");
  const counterOrders = orders.filter((o) => o.channel === "COUNTER");

  // Top products
  const productCounts: Record<string, { name: string; quantity: number; revenue: number }> = {};
  orders.forEach((o) =>
    o.items.forEach((item) => {
      if (!productCounts[item.productName]) {
        productCounts[item.productName] = { name: item.productName, quantity: 0, revenue: 0 };
      }
      productCounts[item.productName].quantity += item.quantity;
      productCounts[item.productName].revenue += Number(item.totalPrice);
    })
  );
  const topProducts = Object.values(productCounts)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return NextResponse.json({
    date,
    totalOrders,
    totalRevenue,
    cancelledOrders: cancelled,
    financial: {
      riderCompensation,
      netAfterRiderCompensation,
      deliveryCompletedCount,
    },
    byType: {
      asporto: { count: asportoOrders.length, revenue: asportoOrders.reduce((s, o) => s + Number(o.total), 0) },
      delivery: { count: deliveryOrders.length, revenue: deliveryOrders.reduce((s, o) => s + Number(o.total), 0) },
    },
    byChannel: {
      web: { count: webOrders.length, revenue: webOrders.reduce((s, o) => s + Number(o.total), 0) },
      phone: { count: phoneOrders.length, revenue: phoneOrders.reduce((s, o) => s + Number(o.total), 0) },
      counter: { count: counterOrders.length, revenue: counterOrders.reduce((s, o) => s + Number(o.total), 0) },
    },
    topProducts,
  });
}
