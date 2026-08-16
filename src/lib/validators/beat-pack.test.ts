import { describe, it, expect } from "vitest";
import {
  createBeatPackSchema,
  updateBeatPackSchema,
  beatPackFilterSchema,
  beatPackTierSchema,
  createBeatPackOrderSchema,
} from "./beat-pack";

describe("beatPackTierSchema", () => {
  it("accepts valid prices", () => {
    const result = beatPackTierSchema.safeParse({ basic: 499, premium: 1499, unlimited: 9999 });
    expect(result.success).toBe(true);
  });

  it("rejects price of 0", () => {
    const result = beatPackTierSchema.safeParse({ basic: 0, premium: 1499, unlimited: 9999 });
    expect(result.success).toBe(false);
  });

  it("rejects missing tier", () => {
    const result = beatPackTierSchema.safeParse({ basic: 499, premium: 1499 });
    expect(result.success).toBe(false);
  });

  it("coerces string prices to numbers", () => {
    const result = beatPackTierSchema.parse({ basic: "499", premium: "1499", unlimited: "9999" });
    expect(result.basic).toBe(499);
  });
});

describe("createBeatPackSchema", () => {
  const validInput = {
    title: "My Pack",
    beatIds: ["beat1"],
    prices: { basic: 499, premium: 1499, unlimited: 9999 },
  };

  it("accepts minimal valid input", () => {
    const result = createBeatPackSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts full valid input", () => {
    const result = createBeatPackSchema.safeParse({
      ...validInput,
      description: "Great pack",
      metadata: "Meta info",
      coverUrl: "https://example.com/cover.jpg",
      imageUrls: ["https://example.com/img1.jpg"],
      tags: ["trap", "dark"],
      status: "published",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = createBeatPackSchema.safeParse({ beatIds: ["b1"], prices: validInput.prices });
    expect(result.success).toBe(false);
  });

  it("rejects empty beatIds array", () => {
    const result = createBeatPackSchema.safeParse({ ...validInput, beatIds: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing prices", () => {
    const result = createBeatPackSchema.safeParse({ title: "Pack", beatIds: ["b1"] });
    expect(result.success).toBe(false);
  });

  it("defaults status to draft", () => {
    const result = createBeatPackSchema.parse(validInput);
    expect(result.status).toBe("draft");
  });

  it("defaults tags to empty array", () => {
    const result = createBeatPackSchema.parse(validInput);
    expect(result.tags).toEqual([]);
  });

  it("rejects more than 10 images", () => {
    const result = createBeatPackSchema.safeParse({
      ...validInput,
      imageUrls: Array.from({ length: 11 }, (_, i) => `https://example.com/img${i}.jpg`),
    });
    expect(result.success).toBe(false);
  });
});

describe("updateBeatPackSchema", () => {
  it("accepts empty object", () => {
    const result = updateBeatPackSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateBeatPackSchema.safeParse({ title: "Updated Pack" });
    expect(result.success).toBe(true);
  });

  it("allows archived status", () => {
    const result = updateBeatPackSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(true);
  });

  it("rejects short title", () => {
    const result = updateBeatPackSchema.safeParse({ title: "A" });
    expect(result.success).toBe(false);
  });
});

describe("beatPackFilterSchema", () => {
  it("provides defaults", () => {
    const result = beatPackFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(12);
  });

  it("rejects limit above 50", () => {
    const result = beatPackFilterSchema.safeParse({ limit: 51 });
    expect(result.success).toBe(false);
  });
});

describe("createBeatPackOrderSchema", () => {
  it("accepts valid order", () => {
    const result = createBeatPackOrderSchema.safeParse({ packId: "abc123", tier: "basic" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid tier", () => {
    const result = createBeatPackOrderSchema.safeParse({ packId: "abc", tier: "free" });
    expect(result.success).toBe(false);
  });

  it("rejects missing packId", () => {
    const result = createBeatPackOrderSchema.safeParse({ tier: "basic" });
    expect(result.success).toBe(false);
  });
});
