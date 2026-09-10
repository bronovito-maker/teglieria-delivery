import { readRegistry } from "@/lib/allergens/server";
import { productResult, snapshot } from "@/lib/allergens/core";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isOperatorUser } from "@/lib/rbac";
import { getCanonicalProduct, getCanonicalProductIngredients } from "@/lib/catalog";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const rider = user
    ? await prisma.rider.findFirst({ where: { authUserId: user.id, active: true }, select: { id: true } })
    : null;
  const isClubMember = Boolean(user && !rider && !isOperatorUser(user));
  const allergenRegistry = await readRegistry();
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
    products: category.products
      .filter((product) => getCanonicalProduct(category.name, product.name)?.active !== false)
      .map((product) => ({
      ...product,
      category: {
        id: category.id,
        name: category.name,
        sortOrder: category.sortOrder,
        active: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      },
      ingredients: getCanonicalProductIngredients(category.name, product.name),
      allergenInfo: snapshot(allergenRegistry, productResult(allergenRegistry.graph, product.id)),
      allergenRegistry,
      standardPrice: product.price,
      isClubPrice: isClubMember && product.clubPrice != null,
      price: isClubMember && product.clubPrice != null ? product.clubPrice : product.price,
    })),
  })), promotions });
}
