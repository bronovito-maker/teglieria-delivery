import { createHmac, timingSafeEqual } from "node:crypto";
import { OrderStatus } from "@prisma/client";
import { z } from "zod";
export const BRIDGE_PATH = "/api/integrations/gestionale/bridge";
export const acknowledgmentSchema = z.object({
  orderId: z.string().min(1).max(128),
  order_id: z.string().min(1).max(128),
  row_version: z.number().int().nonnegative(),
  acceptance_state: z.enum(["DA_ACCETTARE", "ACCEPTED", "REJECTED"]),
  production_state: z.string().max(40),
  fulfillment_state: z.string().max(40),
  payment_state: z.string().max(40),
  fiscal_state: z.string().max(40),
  sale_id: z.string().max(128).nullable(),
});
export type Acknowledgment = z.infer<typeof acknowledgmentSchema>;
export const bridgeRequestSchema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("poll") }).strict(),
  z.object({ operation: z.literal("ack"), state: acknowledgmentSchema }).strict(),
  z.object({ operation: z.literal("error"), orderId: z.string().max(128), code: z.string().regex(/^[A-Z0-9_:.-]{1,120}$/) }).strict(),
]);
export function verifyBridgeSignature(body: string, headers: Headers, secret: string, now = Date.now()): boolean {
  const timestamp = headers.get("x-gestionale-timestamp") ?? "";
  const nonce = headers.get("x-gestionale-nonce") ?? "";
  const signature = headers.get("x-gestionale-signature") ?? "";
  if (secret.length < 32 || !/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 120 || !/^[a-f0-9-]{36}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}\n${nonce}\nPOST\n${BRIDGE_PATH}\n${body}`).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export function statusFromBackend(state: Acknowledgment): OrderStatus | null {
  state = { ...state, production_state: state.production_state.toUpperCase() };
  if (state.acceptance_state === "REJECTED" || state.fulfillment_state === "CANCELLED") return "CANCELLED";
  if (["DELIVERED", "PICKED_UP"].includes(state.fulfillment_state)) return "DELIVERED";
  if (state.fulfillment_state === "OUT_FOR_DELIVERY") return "OUT";
  if (["READY", "ALL_READY"].includes(state.production_state) || state.fulfillment_state === "READY_FOR_PICKUP") return "READY";
  if (["PREPARING", "IN_PROGRESS", "PARTIALLY_READY"].includes(state.production_state)) return "PREPARING";
  return state.acceptance_state === "ACCEPTED" ? "CONFIRMED" : null;
}
export function canAdvanceStatus(current: OrderStatus, next: OrderStatus | null): next is OrderStatus {
  if (!next || current === "CANCELLED" || current === "DELIVERED") return false;
  const sequence: OrderStatus[] = ["RECEIVED", "CONFIRMED", "PREPARING", "READY", "OUT", "DELIVERED"];
  return next === "CANCELLED" || sequence.indexOf(next) > sequence.indexOf(current);
}
