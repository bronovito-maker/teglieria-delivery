import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { isOperatorUser } from "@/lib/rbac";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = typeof user?.user_metadata?.role === "string" ? user.user_metadata.role : null;
  const isClubMember = Boolean(user && role !== "rider" && !isOperatorUser(user));
  const categories = await prisma.category.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
    include: {
      products: {
        where: { active: true },
        orderBy: { sortOrder: "asc" },
        include: {
          variants: { where: { active: true } },
          additions: { where: { active: true } },
          removals: { where: { active: true } },
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
