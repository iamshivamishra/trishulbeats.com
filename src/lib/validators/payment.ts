import { z } from "zod";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format");

export const createOrderSchema = z.object({
  beatId: objectId,
  licenseId: objectId,
});

export const createPackOrderSchema = z.object({
  packId: objectId,
  tier: z.enum(["basic", "premium", "unlimited"]),
  couponCode: z.string().optional(),
});

export const checkoutCartSchema = z.object({
  fromCart: z.literal(true),
});

export const checkoutCombinedSchema = z.object({
  fromCart: z.literal(true),
  includePackCart: z.literal(true),
  couponCode: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentId: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
});

export const createUpgradeOrderSchema = z.object({
  packId: objectId,
  targetTier: z.enum(["premium", "unlimited"]),
});

export const failOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().max(500).default("Payment cancelled by user"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreatePackOrderInput = z.infer<typeof createPackOrderSchema>;
export type CheckoutCartInput = z.infer<typeof checkoutCartSchema>;
export type CheckoutCombinedInput = z.infer<typeof checkoutCombinedSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type CreateUpgradeOrderInput = z.infer<typeof createUpgradeOrderSchema>;
export type FailOrderInput = z.infer<typeof failOrderSchema>;
