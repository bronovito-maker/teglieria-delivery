import { z } from "zod";

const nullableText = (max = 1000) => z.string().trim().max(max).nullable().optional();

export const categoryCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    sortOrder: z.number().int().optional(),
    active: z.boolean().optional(),
  })
  .strict();

export const categoryPatchSchema = categoryCreateSchema
  .extend({
    id: z.string().min(1),
  })
  .strict();

export const productVariantInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    priceDelta: z.number(),
  })
  .strict();

export const productAdditionInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    price: z.number().nonnegative(),
  })
  .strict();

export const productRemovalInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
  })
  .strict();

export const productCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    description: nullableText(),
    price: z.number().nonnegative(),
    imageUrl: z.string().trim().url().nullable().optional(),
    categoryId: z.string().min(1),
    active: z.boolean().optional(),
    sortOrder: z.number().int().optional(),
    kitchenNotes: nullableText(),
    variants: z.array(productVariantInputSchema).optional(),
    additions: z.array(productAdditionInputSchema).optional(),
    removals: z.array(productRemovalInputSchema).optional(),
  })
  .strict();

export const productPatchSchema = productCreateSchema.partial().strict();

const promotionItemSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive().max(20) }).strict();
const clubPromotionFields = z.object({
  title: z.string().trim().min(1).max(120),
  description: nullableText(),
  price: z.number().nonnegative(),
  imageUrl: z.string().trim().url().nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  items: z.array(promotionItemSchema).min(1).max(10),
}).strict();
export const clubPromotionCreateSchema = clubPromotionFields.superRefine((data, ctx) => {
  if (new Date(data.endsAt) <= new Date(data.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "La fine deve essere successiva all'inizio" });
});
export const clubPromotionPatchSchema = clubPromotionFields.partial().extend({ id: z.string().min(1) }).strict();

export const closureUpsertSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    reason: z.string().trim().max(200).nullable().optional(),
  })
  .strict();

export const scheduleDaySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    isOpen: z.boolean(),
    lunchActive: z.boolean(),
    lunchStart: z.string().regex(/^\d{2}:\d{2}$/),
    lunchEnd: z.string().regex(/^\d{2}:\d{2}$/),
    dinnerActive: z.boolean(),
    dinnerStart: z.string().regex(/^\d{2}:\d{2}$/),
    dinnerEnd: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .strict();

export const scheduleDaysSchema = z.array(scheduleDaySchema).length(7);

export const adminConfigSchema = z
  .object({
    maxOrdersPerSlot: z.number().int().positive().max(100),
  })
  .strict();

export const riderVehicleSchema = z.enum(["BIKE", "SCOOTER", "CAR"]);

export const riderCreateSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    vehicle: riderVehicleSchema.optional(),
    zone: z.string().trim().max(120).nullable().optional(),
  })
  .strict();

export const riderPatchSchema = riderCreateSchema
  .partial()
  .extend({
    active: z.boolean().optional(),
  })
  .strict();

export const customerWelcomeSchema = z
  .object({
    email: z.string().trim().email(),
    name: z.string().trim().min(1).max(120),
  })
  .strict();

export const riderSetupSchema = z
  .object({
    authUserId: z.string().min(1).optional(),
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().email(),
    phone: z.string().trim().max(30).nullable().optional(),
    checkOnly: z.boolean().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.checkOnly && !data.authUserId) {
      ctx.addIssue({
        code: "custom",
        path: ["authUserId"],
        message: "authUserId richiesto per completare il setup",
      });
    }
  });

export const reportQuerySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

export const logisticsSlotsQuerySchema = reportQuerySchema;
