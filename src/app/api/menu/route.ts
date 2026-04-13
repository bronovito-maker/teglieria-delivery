import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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
  return NextResponse.json(categories);
}
