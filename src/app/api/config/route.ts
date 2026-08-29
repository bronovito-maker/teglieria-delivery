import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const config = await prisma.globalConfig.findUnique({ where: { id: "default" } });
  return NextResponse.json(
    { deliveryFee: Number(config?.deliveryFee ?? 2.5) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
