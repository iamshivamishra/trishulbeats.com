import { z } from "zod";

const GENRES = [
  "Hip Hop",
  "Trap",
  "R&B",
  "Pop",
  "Lo-Fi",
  "Drill",
  "Boom Bap",
  "Afrobeats",
  "Dancehall",
  "Electronic",
  "Rock",
  "Jazz",
  "Soul",
  "Reggaeton",
  "Other",
] as const;

const MUSICAL_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Am",
  "A#m",
  "Bm",
] as const;

const MOODS = [
  "Dark",
  "Happy",
  "Sad",
  "Energetic",
  "Chill",
  "Aggressive",
  "Romantic",
  "Motivational",
  "Melancholic",
  "Upbeat",
] as const;

const uploadedAssetSchema = z.object({
  url: z.string().url("Asset URL must be valid"),
  key: z.string().min(1, "Asset key is required"),
});

export const createBeatSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be at most 100 characters")
    .trim(),

  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .trim()
    .optional(),

  bpm: z.coerce
    .number()
    .int()
    .min(40, "BPM must be at least 40")
    .max(300, "BPM must be at most 300")
    .optional(),

  key: z.enum(MUSICAL_KEYS).optional(),

  genre: z.enum(GENRES, {
    error: "Please select a valid genre",
  }),

  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10, "Maximum 10 tags allowed")
    .default([]),

  mood: z.enum(MOODS).optional(),

  status: z.enum(["draft", "published"]).default("draft"),

  licenses: z
    .object({
      basic: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),

      premium: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),

      unlimited: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),
    })
    .optional(),

  uploadedAssets: z
    .object({
      preview: uploadedAssetSchema,
      master: uploadedAssetSchema,
      stems: uploadedAssetSchema.optional(),
      artwork: uploadedAssetSchema.optional(),
    })
    .optional(),
});

export const updateBeatSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be at most 100 characters")
    .trim()
    .optional(),

  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .trim()
    .optional(),

  bpm: z.coerce.number().int().min(40).max(300).optional(),

  key: z.enum(MUSICAL_KEYS).optional(),

  genre: z.enum(GENRES).optional(),

  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10)
    .optional(),

  mood: z.enum(MOODS).optional(),

  status: z.enum(["draft", "published", "archived"]).optional(),

  isPublished: z.boolean().optional(),

  licenses: z
    .object({
      basic: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),

      premium: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),

      unlimited: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),
    })
    .optional(),

  uploadedAssets: z
    .object({
      preview: uploadedAssetSchema.optional(),
      master: uploadedAssetSchema.optional(),
      stems: uploadedAssetSchema.optional(),
      artwork: uploadedAssetSchema.optional(),
    })
    .optional(),
});

export const beatFilterSchema = z.object({
  genre: z.string().optional(),

  bpmMin: z.coerce.number().int().min(40).optional(),

  bpmMax: z.coerce.number().int().max(300).optional(),

  key: z.string().optional(),

  mood: z.string().optional(),

  tags: z.string().optional(),

  search: z.string().max(100).optional(),

  producer: z.string().max(100).optional(),

  producerId: z.string().optional(),

  priceMin: z.coerce.number().min(0).optional(),

  priceMax: z.coerce.number().optional(),

  status: z.enum(["draft", "published", "archived"]).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(50).default(12),

  sort: z
    .enum([
      "newest",
      "popular",
      "most_sold",
      "price_asc",
      "price_desc",
    ])
    .default("newest"),
});

export const GENRE_OPTIONS = GENRES;
export const KEY_OPTIONS = MUSICAL_KEYS;
export const MOOD_OPTIONS = MOODS;

export type CreateBeatInput = z.infer<typeof createBeatSchema>;
export type UpdateBeatInput = z.infer<typeof updateBeatSchema>;
export type BeatFilterInput = z.infer<typeof beatFilterSchema>;