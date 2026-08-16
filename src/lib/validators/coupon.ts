import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

const couponBaseFields = {
  code: z
    .string()
    .min(3, "Code must be at least 3 characters")
    .max(20, "Code must be at most 20 characters")
    .regex(/^[A-Z0-9_-]+$/i, "Code can only contain letters, numbers, hyphens, and underscores")
    .transform((v) => v.toUpperCase()),
  description: z.string().max(200).optional(),
  discountType: z.enum(["flat", "percentage"]),
  discountValue: z.number().positive("Discount must be positive"),
  maxDiscountCap: z.number().positive().optional(),
  minOrderAmount: z.number().min(0).optional(),
  applicablePacks: z.array(objectId).default([]),
  restrictedToUsers: z.array(objectId).default([]),
  restrictedToEmails: z
    .array(z.string().email().transform((e) => e.toLowerCase()))
    .default([]),
  startsAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
  maxUses: z.number().int().min(0).default(0),
  maxUsesPerUser: z.number().int().min(0).default(1),
};

export const createCouponSchema = z
  .object(couponBaseFields)
  .refine((d) => d.expiresAt > d.startsAt, {
    message: "Expiry date must be after start date",
    path: ["expiresAt"],
  })
  .refine((d) => d.discountType !== "percentage" || d.discountValue <= 100, {
    message: "Percentage discount cannot exceed 100%",
    path: ["discountValue"],
  });

const { code: _code, ...updateFields } = couponBaseFields;
export const updateCouponSchema = z.object(updateFields).partial().extend({
  isDraft: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  packIds: z.array(objectId).min(1, "At least one pack is required"),
  tiers: z
    .record(objectId, z.enum(["basic", "premium", "unlimited"]))
    .optional(),
});

export const checkCodeSchema = z.object({
  code: z.string().min(3).max(20),
  excludeId: objectId.optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
export type CheckCodeInput = z.infer<typeof checkCodeSchema>;
