import { Prisma } from "@prisma/client";
import { z } from "zod";

export const orderTypeSchema = z.enum(["ASPORTO", "DELIVERY"]);
export const orderChannelSchema = z.enum(["WEB", "PHONE", "COUNTER"]);
export const orderStatusSchema = z.enum([
  "RECEIVED",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT",
  "DELIVERED",
  "CANCELLED",
]);
export const deliveryStatusSchema = z.enum([
  "ASSIGNED",
  "PICKED_UP",
  "EN_ROUTE",
  "DELIVERED",
]);
export const paymentMethodSchema = z.enum(["CONTANTI", "POS"]);

const optionalTextSchema = z.string().trim().max(1000).nullable().optional();
const optionalDateSchema = z.string().datetime().nullable().optional();

export const orderItemSchema = z
  .object({
    productId: z.string().min(1),
    productName: z.string().trim().min(1).max(200),
    quantity: z.number().int().positive().max(99),
    unitPrice: z.number().nonnegative(),
    totalPrice: z.number().nonnegative(),
    variant: z.string().trim().max(120).nullable().optional(),
    additions: z.array(z.object({ name: z.string(), price: z.number() }).passthrough()).nullable().optional(),
    removals: z.array(z.object({ name: z.string() }).passthrough()).nullable().optional(),
    notes: optionalTextSchema,
  })
  .strict();

export const createOrderSchema = z
  .object({
    type: orderTypeSchema,
    channel: orderChannelSchema.optional(),
    customerName: z.string().trim().min(1).max(120),
    customerPhone: z.string().trim().min(5).max(30),
    customerEmail: z.string().trim().email().nullable().optional(),
    address: z.string().trim().max(300).nullable().optional(),
    addressDetail: z.string().trim().max(300).nullable().optional(),
    deliveryZone: z.string().trim().max(120).nullable().optional(),
    deliveryKm: z.number().nonnegative().nullable().optional(),
    deliveryCost: z.number().nonnegative().nullable().optional(),
    pickupTime: optionalDateSchema,
    timeSlot: z.string().trim().max(30).nullable().optional(),
    estimatedTime: optionalDateSchema,
    subtotal: z.number().nonnegative(),
    total: z.number().nonnegative(),
    notes: optionalTextSchema,
    paymentMethod: paymentMethodSchema.optional(),
    items: z.array(orderItemSchema).min(1).max(100),
  })
  .strict()
  .superRefine((order, ctx) => {
    if (order.type === "DELIVERY" && !order.address) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "Indirizzo richiesto per consegna delivery",
      });
    }
  });

export const orderPatchSchema = z
  .object({
    status: orderStatusSchema.optional(),
    riderId: z.string().min(1).nullable().optional(),
    deliveryStatus: deliveryStatusSchema.optional(),
    actualTime: z.string().datetime().optional(),
    estimatedTime: z.string().datetime().optional(),
    statusNote: z.string().trim().max(500).optional(),
  })
  .strict();

export type OrderPatchBody = z.infer<typeof orderPatchSchema>;
export type OrderStatusInput = z.infer<typeof orderStatusSchema>;
export type DeliveryStatusInput = z.infer<typeof deliveryStatusSchema>;

export function generateOrderCode(type: z.infer<typeof orderTypeSchema>, sequenceNumber: number, suffix?: string): string {
  const prefix = type === "DELIVERY" ? "D" : "A";
  const padded = sequenceNumber < 1000 ? String(sequenceNumber).padStart(3, "0") : String(sequenceNumber);
  return `${prefix}${padded}${suffix ? `-${suffix}` : ""}`;
}

export function toNullableJson(value: unknown) {
  return value == null ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}
