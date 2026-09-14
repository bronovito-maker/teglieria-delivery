import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServiceAvailability } from "@/lib/service-availability";

export async function GET() {
  const config = await prisma.globalConfig.findUnique({ where: { id: "default" } });
  const services = getServiceAvailability(config);
  return NextResponse.json(
    { deliveryFee: Math.max(2, Number(config?.deliveryFee ?? 2)), services },
    { headers: { "Cache-Control": "no-store" } },
  );
}
