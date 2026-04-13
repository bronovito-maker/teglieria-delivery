import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let config = await prisma.globalConfig.findFirst();
  if (!config) {
    config = await prisma.globalConfig.create({ data: { maxOrdersPerSlot: 5 } });
  }
  return NextResponse.json(config);
}

export async function POST(request: Request) {
  try {
    const { maxOrdersPerSlot } = await request.json();
    
    let config = await prisma.globalConfig.findFirst();
    if (config) {
      config = await prisma.globalConfig.update({
        where: { id: config.id },
        data: { maxOrdersPerSlot },
      });
    } else {
      config = await prisma.globalConfig.create({
        data: { maxOrdersPerSlot },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Errore salvataggio config:", error);
    return NextResponse.json({ error: "Errore salvataggio config" }, { status: 500 });
  }
}
