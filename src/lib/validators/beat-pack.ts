import { z } from "zod";

const priceSchema = z.coerce.number().min(1, "Price must be at least ₹1");

export const beatPackTierSchema = z.object({
  basic: priceSchema,
  premium: priceSchema,
  unlimited: priceSchema,
});

export const createBeatPackSchema = z.object({
  title: z.string().min(2).max(120).trim(),
  description: z.string().max(1000).trim().optional(),
  coverUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).default([]),
  beatIds: z.array(z.string().min(1)).min(1, "At least one beat is required"),
  prices: beatPackTierSchema,
  status: z.enum(["draft", "published"]).default("draft"),
});

export const updateBeatPackSchema = z.object({
  title: z.string().min(2).max(120).trim().optional(),
  description: z.string().max(1000).trim().optional(),
  coverUrl: z.string().url().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  beatIds: z.array(z.string().min(1)).min(1).optional(),
  prices: beatPackTierSchema.optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  isPublished: z.boolean().optional(),
});

export const beatPackFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: z.string().max(100).optional(),
  producer: z.string().max(100).optional(),
  producerId: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const createBeatPackOrderSchema = z.object({
  packId: z.string().min(1, "Pack ID is required"),
  tier: z.enum(["basic", "premium", "unlimited"]),
});

export type CreateBeatPackInput = z.infer<typeof createBeatPackSchema>;
export type UpdateBeatPackInput = z.infer<typeof updateBeatPackSchema>;
export type BeatPackFilterInput = z.infer<typeof beatPackFilterSchema>;
export type CreateBeatPackOrderInput = z.infer<typeof createBeatPackOrderSchema>;

