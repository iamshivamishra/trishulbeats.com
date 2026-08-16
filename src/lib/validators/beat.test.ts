import { describe, it, expect } from "vitest";
import { createBeatSchema, updateBeatSchema, beatFilterSchema, GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "./beat";

describe("createBeatSchema", () => {
  const validInput = {
    title: "My Beat",
    genre: "Trap",
  };

  it("accepts minimal valid input", () => {
    const result = createBeatSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts full valid input", () => {
    const result = createBeatSchema.safeParse({
      ...validInput,
      description: "A dope beat",
      bpm: 140,
      key: "Am",
      mood: "Dark",
      tags: ["trap", "hard"],
      status: "published",
      licenses: { basic: { price: 499 }, premium: { price: 1499 } },
      uploadedAssets: {
        preview: { url: "https://example.com/p.mp3", key: "preview.mp3" },
        master: { url: "https://example.com/m.wav", key: "master.wav" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing title", () => {
    const result = createBeatSchema.safeParse({ genre: "Trap" });
    expect(result.success).toBe(false);
  });

  it("rejects missing genre", () => {
    const result = createBeatSchema.safeParse({ title: "My Beat" });
    expect(result.success).toBe(false);
  });

  it("rejects title shorter than 2 chars", () => {
    const result = createBeatSchema.safeParse({ title: "A", genre: "Trap" });
    expect(result.success).toBe(false);
  });

  it("rejects title longer than 100 chars", () => {
    const result = createBeatSchema.safeParse({ title: "x".repeat(101), genre: "Trap" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid genre", () => {
    const result = createBeatSchema.safeParse({ title: "Beat", genre: "Country" });
    expect(result.success).toBe(false);
  });

  it("rejects BPM below 40", () => {
    const result = createBeatSchema.safeParse({ ...validInput, bpm: 39 });
    expect(result.success).toBe(false);
  });

  it("rejects BPM above 300", () => {
    const result = createBeatSchema.safeParse({ ...validInput, bpm: 301 });
    expect(result.success).toBe(false);
  });

  it("accepts BPM at boundaries (40 and 300)", () => {
    expect(createBeatSchema.safeParse({ ...validInput, bpm: 40 }).success).toBe(true);
    expect(createBeatSchema.safeParse({ ...validInput, bpm: 300 }).success).toBe(true);
  });

  it("coerces BPM string to number", () => {
    const result = createBeatSchema.safeParse({ ...validInput, bpm: "120" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.bpm).toBe(120);
  });

  it("rejects more than 10 tags", () => {
    const result = createBeatSchema.safeParse({
      ...validInput,
      tags: Array.from({ length: 11 }, (_, i) => `tag${i}`),
    });
    expect(result.success).toBe(false);
  });

  it("defaults status to draft", () => {
    const result = createBeatSchema.parse(validInput);
    expect(result.status).toBe("draft");
  });

  it("defaults tags to empty array", () => {
    const result = createBeatSchema.parse(validInput);
    expect(result.tags).toEqual([]);
  });

  it("rejects invalid key", () => {
    const result = createBeatSchema.safeParse({ ...validInput, key: "X#" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid mood", () => {
    const result = createBeatSchema.safeParse({ ...validInput, mood: "Confused" });
    expect(result.success).toBe(false);
  });
});

describe("updateBeatSchema", () => {
  it("accepts empty object (all optional)", () => {
    const result = updateBeatSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateBeatSchema.safeParse({ title: "New Title", bpm: 100 });
    expect(result.success).toBe(true);
  });

  it("allows archived status", () => {
    const result = updateBeatSchema.safeParse({ status: "archived" });
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 2 chars", () => {
    const result = updateBeatSchema.safeParse({ title: "A" });
    expect(result.success).toBe(false);
  });
});

describe("beatFilterSchema", () => {
  it("accepts empty object with defaults", () => {
    const result = beatFilterSchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(12);
    expect(result.sort).toBe("newest");
  });

  it("accepts valid filters", () => {
    const result = beatFilterSchema.safeParse({
      genre: "Trap",
      bpmMin: 80,
      bpmMax: 160,
      sort: "popular",
      page: 2,
      limit: 24,
    });
    expect(result.success).toBe(true);
  });

  it("coerces page and limit from strings", () => {
    const result = beatFilterSchema.parse({ page: "3", limit: "20" });
    expect(result.page).toBe(3);
    expect(result.limit).toBe(20);
  });

  it("rejects limit above 50", () => {
    const result = beatFilterSchema.safeParse({ limit: 51 });
    expect(result.success).toBe(false);
  });

  it("rejects page below 1", () => {
    const result = beatFilterSchema.safeParse({ page: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects invalid sort value", () => {
    const result = beatFilterSchema.safeParse({ sort: "random" });
    expect(result.success).toBe(false);
  });
});

describe("exported constants", () => {
  it("GENRE_OPTIONS contains expected genres", () => {
    expect(GENRE_OPTIONS).toContain("Trap");
    expect(GENRE_OPTIONS).toContain("Hip Hop");
    expect(GENRE_OPTIONS.length).toBeGreaterThan(5);
  });

  it("KEY_OPTIONS contains major and minor keys", () => {
    expect(KEY_OPTIONS).toContain("C");
    expect(KEY_OPTIONS).toContain("Am");
    expect(KEY_OPTIONS.length).toBe(24);
  });

  it("MOOD_OPTIONS contains expected moods", () => {
    expect(MOOD_OPTIONS).toContain("Dark");
    expect(MOOD_OPTIONS).toContain("Happy");
    expect(MOOD_OPTIONS.length).toBe(10);
  });
});
