import "server-only";
import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { readRegistry } from "@/lib/allergens/server";
import { productResult, snapshot } from "@/lib/allergens/core";
import { isOperatorUser } from "@/lib/rbac";
import { getCanonicalProduct, getCanonicalProductIngredients } from "@/lib/catalog";
import { unstable_cache } from "next/cache";

const getBaseMenuData = unstable_cache(async () => {
  const [allergenRegistry, categories] = await Promise.all([
    readRegistry(),
    prisma.category.findMany({
      where: { active: true }, orderBy: { sortOrder: "asc" },
      include: { products: { where: { active: true }, orderBy: { sortOrder: "asc" }, include: {
        variants: { where: { active: true } }, additions: { where: { active: true } }, removals: { where: { active: true } },
      } } },
    }),
  ]);
  return { allergenRegistry, categories };
}, ["public-menu-base-v1"], { revalidate: 300, tags: ["public-menu"] });

export async function getMenuData(user: User | null) {
  const rider = user ? await prisma.rider.findFirst({ where: { authUserId: user.id, active: true }, select: { id: true } }) : null;
  const isClubMember = Boolean(user && !rider && !isOperatorUser(user));
  const { allergenRegistry, categories } = await getBaseMenuData();
  const promotions = isClubMember ? await prisma.clubPromotion.findMany({
    where: { active: true, startsAt: { lte: new Date() }, endsAt: { gt: new Date() } },
    orderBy: [{ sortOrder: "asc" }, { startsAt: "asc" }], take: 2,
    include: { items: { include: { product: { select: { id: true, name: true } } } } },
  }) : [];
  return { isClubMember, categories: categories.map((category) => ({
    ...category,
    products: category.products.filter((product) => getCanonicalProduct(category.name, product.name)?.active !== false).map((product) => ({
      ...product,
      category: { id: category.id, name: category.name, sortOrder: category.sortOrder, active: category.active, createdAt: category.createdAt, updatedAt: category.updatedAt },
      ingredients: getCanonicalProductIngredients(category.name, product.name),
      allergenInfo: snapshot(allergenRegistry, productResult(allergenRegistry.graph, product.id)),
      allergenRegistry, standardPrice: product.price,
      isClubPrice: isClubMember && product.clubPrice != null,
      price: isClubMember && product.clubPrice != null ? product.clubPrice : product.price,
    })),
  })), promotions };
}
