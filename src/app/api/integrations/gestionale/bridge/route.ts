import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { bridgeRequestSchema, verifyBridgeSignature } from "@/lib/gestionale-bridge-contract";
import { acknowledgeGestionaleOrder, pollGestionaleOrders } from "@/lib/gestionale-bridge";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function reply(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: NextRequest) {
  const secret = process.env.GESTIONALE_BRIDGE_SECRET ?? "";
  if (process.env.GESTIONALE_BRIDGE_ENABLED !== "true" || secret.length < 32) return reply({ error: "BRIDGE_DISABLED" }, 503);
  if (Number(request.headers.get("content-length") ?? 0) > 32_768) return reply({ error: "BODY_TOO_LARGE" }, 413);
  const body = await request.text();
  if (Buffer.byteLength(body) > 32_768) return reply({ error: "BODY_TOO_LARGE" }, 413);
  if (!verifyBridgeSignature(body, request.headers, secret)) return reply({ error: "UNAUTHORIZED" }, 401);
  let input;
  try { input = bridgeRequestSchema.parse(JSON.parse(body)); } catch { return reply({ error: "INVALID_REQUEST" }, 400); }
  try {
    await prisma.gestionaleNonce.create({ data: { nonce: request.headers.get("x-gestionale-nonce")!, expiresAt: new Date(Date.now() + 300_000) } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return reply({ error: "REPLAY" }, 409);
    return reply({ error: "BRIDGE_UNAVAILABLE" }, 503);
  }
  try {
    await prisma.gestionaleNonce.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (input.operation === "poll") return reply({ orders: await pollGestionaleOrders() });
    if (input.operation === "ack") return reply(await acknowledgeGestionaleOrder(input.state));
    await prisma.gestionaleOrder.update({ where: { orderId: input.orderId }, data: { lastError: input.code, nextPollAt: new Date(Date.now() + 60_000) } });
    return reply({ recorded: true });
  } catch {
    // Payloads contain personal information. Keep errors code-only.
    return reply({ error: "BRIDGE_CONFLICT_OR_UNAVAILABLE" }, 503);
  }
}
