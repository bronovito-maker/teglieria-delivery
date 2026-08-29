import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.globalConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json(
    { deliveryFee: Math.max(2, Number(config?.deliveryFee ?? 2)) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
