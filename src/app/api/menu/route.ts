import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getUserRole, isOperatorUser } from "@/lib/rbac";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = getUserRole(user);
  const isClubMember = Boolean(user && role !== "rider" && !isOperatorUser(user));
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          clubPrice: true,
          promoPrice: true,
          imageUrl: true,
          categoryId: true,
          active: true,
          sortOrder: true,
          configuration: true,
          variants: {
            where: { active: true },
            select: { id: true, productId: true, name: true, priceDelta: true, active: true },
          },
          additions: {
            where: { active: true },
            select: { id: true, productId: true, name: true, price: true, active: true },
          },
          removals: {
            where: { active: true },
            select: { id: true, productId: true, name: true, active: true },
          },
        },
      },
    },
  });
  const promotions = isClubMember
    ? await prisma.clubPromotion.findMany({
        where: { active: true, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
        orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }],
        take: 2,
        include: { items: { include: { product: { select: { id: true, name: true } } } } },
      })
    : [];
  return NextResponse.json({ isClubMember, categories: categories.map((category) => ({
    ...category,
    products: category.products.map((product) => ({
      ...product,
      standardPrice: product.price,
      isClubPrice: isClubMember && product.clubPrice != null,
      price: isClubMember && product.clubPrice != null ? product.clubPrice : product.price,
    })),
  })), promotions });
}
