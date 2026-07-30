import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("cloudinary", () => {
  const mockUtils = {
    api_sign_request: vi.fn(() => "mock-signature"),
    private_download_url: vi.fn(() => "https://cdn.example.com/signed"),
  };
  const mockUploader = {
    upload_stream: vi.fn((_opts, cb) => {
      const stream = {
        end: vi.fn(() => cb?.(null, { secure_url: "https://cdn.example.com/uploaded" })),
      };
      return stream;
    }),
    destroy: vi.fn(),
  };
  const mockUrl = vi.fn(() => "https://cdn.example.com/public");

  return {
    v2: {
      config: Object.assign(
        vi.fn(() => ({
          cloud_name: "test-cloud",
          api_key: "test-key",
          api_secret: "test-secret",
        })),
        { cloud_name: "test-cloud", api_key: "test-key", api_secret: "test-secret", secure: true }
      ),
      utils: mockUtils,
      uploader: mockUploader,
      url: mockUrl,
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// Mirror the resourceTypeFor logic from r2.ts to test independently
function resourceTypeFor(contentType: string): "image" | "video" | "raw" {
  if (contentType.startsWith("audio/") || contentType.startsWith("video/")) {
    return "video";
  }
  if (contentType.startsWith("image/")) {
    return "image";
  }
  if (contentType === "application/zip" || contentType === "application/x-zip-compressed") {
    return "video";
  }
  return "raw";
}

describe("r2.ts resourceTypeFor", () => {
  it("maps audio content types to 'video'", () => {
    expect(resourceTypeFor("audio/mpeg")).toBe("video");
    expect(resourceTypeFor("audio/wav")).toBe("video");
    expect(resourceTypeFor("audio/x-wav")).toBe("video");
  });

  it("maps video content types to 'video'", () => {
    expect(resourceTypeFor("video/mp4")).toBe("video");
  });

  it("maps image content types to 'image'", () => {
    expect(resourceTypeFor("image/jpeg")).toBe("image");
    expect(resourceTypeFor("image/png")).toBe("image");
    expect(resourceTypeFor("image/webp")).toBe("image");
  });

  it("maps ZIP content types to 'video' (CORS fix)", () => {
    expect(resourceTypeFor("application/zip")).toBe("video");
    expect(resourceTypeFor("application/x-zip-compressed")).toBe("video");
  });

  it("falls back to 'raw' for unknown types", () => {
    expect(resourceTypeFor("application/pdf")).toBe("raw");
    expect(resourceTypeFor("text/plain")).toBe("raw");
  });
});

describe("r2.ts createPresignedUploadUrl", () => {
  beforeEach(() => {
    process.env.CLOUDINARY_CLOUD_NAME = "test-cloud";
    process.env.CLOUDINARY_API_KEY = "test-key";
    process.env.CLOUDINARY_API_SECRET = "test-secret";
  });

  it("generates upload URL with 'video' resource type for ZIP stems", async () => {
    const { createPresignedUploadUrl } = await import("./r2");

    const result = await createPresignedUploadUrl(
      "producers/p1/beats/b1/stems.zip",
      "application/zip",
      5 * 1024 * 1024 * 1024
    );

    expect(result.uploadUrl).toContain("/video/upload");
    expect(result.uploadUrl).not.toContain("/raw/upload");
  });

  it("generates upload URL with 'video' for audio", async () => {
    const { createPresignedUploadUrl } = await import("./r2");

    const result = await createPresignedUploadUrl(
      "producers/p1/beats/b1/preview.mp3",
      "audio/mpeg",
      50 * 1024 * 1024
    );

    expect(result.uploadUrl).toContain("/video/upload");
  });

  it("generates upload URL with 'image' for images", async () => {
    const { createPresignedUploadUrl } = await import("./r2");

    const result = await createPresignedUploadUrl(
      "producers/p1/beats/b1/artwork.jpg",
      "image/jpeg",
      5 * 1024 * 1024
    );

    expect(result.uploadUrl).toContain("/image/upload");
  });
});
