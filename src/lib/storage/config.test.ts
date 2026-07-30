import { describe, it, expect } from "vitest";
import { validateFile, buildBeatKey, buildProfileKey, FILE_LIMITS } from "./config";

describe("validateFile", () => {
  it("accepts valid preview MP3", () => {
    const result = validateFile({ size: 10 * 1024 * 1024, type: "audio/mpeg" }, "preview");
    expect(result.valid).toBe(true);
  });

  it("accepts ZIP as preview upload", () => {
    const result = validateFile({ size: 10 * 1024 * 1024, type: "application/zip" }, "preview");
    expect(result.valid).toBe(true);
  });

  it("accepts valid master WAV", () => {
    const result = validateFile({ size: 100 * 1024 * 1024, type: "audio/wav" }, "master");
    expect(result.valid).toBe(true);
  });

  it("accepts valid stems ZIP", () => {
    const result = validateFile({ size: 500 * 1024 * 1024, type: "application/zip" }, "stems");
    expect(result.valid).toBe(true);
  });

  it("accepts x-zip-compressed for stems", () => {
    const result = validateFile({ size: 100 * 1024 * 1024, type: "application/x-zip-compressed" }, "stems");
    expect(result.valid).toBe(true);
  });

  it("accepts valid artwork JPEG", () => {
    const result = validateFile({ size: 2 * 1024 * 1024, type: "image/jpeg" }, "artwork");
    expect(result.valid).toBe(true);
  });

  it("accepts valid avatar PNG", () => {
    const result = validateFile({ size: 1 * 1024 * 1024, type: "image/png" }, "avatar");
    expect(result.valid).toBe(true);
  });

  it("accepts valid cover WebP", () => {
    const result = validateFile({ size: 3 * 1024 * 1024, type: "image/webp" }, "cover");
    expect(result.valid).toBe(true);
  });

  it("rejects invalid MIME type for stems", () => {
    const result = validateFile({ size: 100 * 1024 * 1024, type: "audio/mpeg" }, "stems");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("Invalid file type");
    }
  });

  it("rejects oversized preview", () => {
    const result = validateFile({ size: 60 * 1024 * 1024, type: "audio/mpeg" }, "preview");
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("under");
    }
  });

  it("rejects oversized artwork", () => {
    const result = validateFile({ size: 10 * 1024 * 1024, type: "image/jpeg" }, "artwork");
    expect(result.valid).toBe(false);
  });

  it("rejects wrong type for artwork", () => {
    const result = validateFile({ size: 1 * 1024 * 1024, type: "audio/mpeg" }, "artwork");
    expect(result.valid).toBe(false);
  });
});

describe("buildBeatKey", () => {
  it("builds preview key with .mp3 extension", () => {
    const key = buildBeatKey("p1", "b1", "preview");
    expect(key).toBe("producers/p1/beats/b1/preview.mp3");
  });

  it("builds master key with .wav extension", () => {
    const key = buildBeatKey("p1", "b1", "master");
    expect(key).toBe("producers/p1/beats/b1/master.wav");
  });

  it("builds stems key with .zip extension", () => {
    const key = buildBeatKey("p1", "b1", "stems");
    expect(key).toBe("producers/p1/beats/b1/stems.zip");
  });

  it("builds artwork key with .jpg extension", () => {
    const key = buildBeatKey("p1", "b1", "artwork");
    expect(key).toBe("producers/p1/beats/b1/artwork.jpg");
  });

  it("uses .zip extension when contentType is application/zip for preview", () => {
    const key = buildBeatKey("p1", "b1", "preview", "application/zip");
    expect(key).toBe("producers/p1/beats/b1/preview.zip");
  });

  it("uses .zip extension when contentType is application/zip for master", () => {
    const key = buildBeatKey("p1", "b1", "master", "application/zip");
    expect(key).toBe("producers/p1/beats/b1/master.zip");
  });

  it("uses .zip for x-zip-compressed", () => {
    const key = buildBeatKey("p1", "b1", "master", "application/x-zip-compressed");
    expect(key).toBe("producers/p1/beats/b1/master.zip");
  });
});

describe("buildProfileKey", () => {
  it("builds avatar key with timestamp", () => {
    const key = buildProfileKey("p1", "avatar");
    expect(key).toMatch(/^producers\/p1\/profile\/avatar-\d+\.jpg$/);
  });

  it("builds cover key with timestamp", () => {
    const key = buildProfileKey("p1", "cover");
    expect(key).toMatch(/^producers\/p1\/profile\/cover-\d+\.jpg$/);
  });
});

describe("FILE_LIMITS", () => {
  it("has correct max sizes", () => {
    expect(FILE_LIMITS.preview.maxSize).toBe(50 * 1024 * 1024);
    expect(FILE_LIMITS.master.maxSize).toBe(500 * 1024 * 1024);
    expect(FILE_LIMITS.stems.maxSize).toBe(5 * 1024 * 1024 * 1024);
    expect(FILE_LIMITS.artwork.maxSize).toBe(5 * 1024 * 1024);
  });

  it("allows ZIP for stems", () => {
    expect(FILE_LIMITS.stems.allowedTypes).toContain("application/zip");
    expect(FILE_LIMITS.stems.allowedTypes).toContain("application/x-zip-compressed");
  });

  it("allows ZIP for preview and master (as alternative upload format)", () => {
    expect(FILE_LIMITS.preview.allowedTypes).toContain("application/zip");
    expect(FILE_LIMITS.master.allowedTypes).toContain("application/zip");
  });
});
