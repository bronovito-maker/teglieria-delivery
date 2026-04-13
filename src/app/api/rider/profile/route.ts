import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const authUserId = searchParams.get("authUserId");

  if (!authUserId) {
    return NextResponse.json({ error: "Missing authUserId" }, { status: 400 });
  }

  const rider = await prisma.rider.findUnique({
    where: { authUserId },
  });

  if (!rider) {
    return NextResponse.json({ error: "Rider not found" }, { status: 404 });
  }

  return NextResponse.json(rider);
}
