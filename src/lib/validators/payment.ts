import { z } from "zod";

export const createOrderSchema = z.object({
  beatId: z.string().min(1, "Beat ID is required"),
  licenseId: z.string().min(1, "License ID is required"),
});

export const createPackOrderSchema = z.object({
  packId: z.string().min(1, "Pack ID is required"),
  tier: z.enum(["basic", "premium", "unlimited"]),
});

export const checkoutCartSchema = z.object({
  fromCart: z.literal(true),
});

export const checkoutCombinedSchema = z.object({
  fromCart: z.literal(true),
  includePackCart: z.literal(true),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentId: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
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
export type FailOrderInput = z.infer<typeof failOrderSchema>;
