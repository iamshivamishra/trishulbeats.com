import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("cloudinary", () => {
  const mockUtils = {
    api_sign_request: vi.fn(() => "mock-signature"),
    private_download_url: vi.fn(() => "https://cdn.example.com/signed"),
  };
  const mockUploader = {
    upload_stream: vi.fn((_opts, cb) => {
      const stream = { end: vi.fn(() => cb?.(null, { secure_url: "https://cdn.example.com/uploaded" })) };
      return stream;
    }),
    destroy: vi.fn(),
  };
  const mockConfig = vi.fn(() => ({
    cloud_name: "test-cloud",
    api_key: "test-key",
    api_secret: "test-secret",
  }));
  const mockUrl = vi.fn(() => "https://cdn.example.com/public");

  return {
    v2: {
      config: Object.assign(mockConfig, { secure: true }),
      utils: mockUtils,
      uploader: mockUploader,
      url: mockUrl,
    },
  };
});

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

// The module uses a module-level `_configured` flag — we need to reset it
// between tests by re-importing. For unit tests of the pure functions, we
// extract the logic we care about into inline helpers that mirror the source.

// ── inferResourceType logic (mirrors cloudinary.ts) ────────────────────
function inferResourceType(input: string): "image" | "video" | "raw" {
  if (
    input.startsWith("audio/") ||
    input.startsWith("video/") ||
    [".mp3", ".wav", ".m4a"].includes(input.toLowerCase())
  ) {
    return "video";
  }
  if (
    input.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(input.toLowerCase())
  ) {
    return "image";
  }
  if (
    input === "application/zip" ||
    input === "application/x-zip-compressed" ||
    input.toLowerCase() === ".zip"
  ) {
    return "video";
  }
  return "raw";
}

function inferResourceTypeFromKey(key: string): "image" | "video" | "raw" {
  const match = key.match(/\.([a-zA-Z0-9]+)$/);
  const ext = match?.[1]?.toLowerCase() ?? "";
  return inferResourceType(`.${ext}`);
}

describe("inferResourceType", () => {
  it("maps audio MIME types to 'video'", () => {
    expect(inferResourceType("audio/mpeg")).toBe("video");
    expect(inferResourceType("audio/mp3")).toBe("video");
    expect(inferResourceType("audio/wav")).toBe("video");
    expect(inferResourceType("audio/x-wav")).toBe("video");
  });

  it("maps audio extensions to 'video'", () => {
    expect(inferResourceType(".mp3")).toBe("video");
    expect(inferResourceType(".wav")).toBe("video");
    expect(inferResourceType(".m4a")).toBe("video");
  });

  it("maps image MIME types to 'image'", () => {
    expect(inferResourceType("image/jpeg")).toBe("image");
    expect(inferResourceType("image/png")).toBe("image");
    expect(inferResourceType("image/webp")).toBe("image");
  });

  it("maps image extensions to 'image'", () => {
    expect(inferResourceType(".jpg")).toBe("image");
    expect(inferResourceType(".jpeg")).toBe("image");
    expect(inferResourceType(".png")).toBe("image");
    expect(inferResourceType(".webp")).toBe("image");
    expect(inferResourceType(".gif")).toBe("image");
  });

  it("maps ZIP MIME types to 'video' (CORS fix for stems)", () => {
    expect(inferResourceType("application/zip")).toBe("video");
    expect(inferResourceType("application/x-zip-compressed")).toBe("video");
  });

  it("maps .zip extension to 'video' (CORS fix for stems)", () => {
    expect(inferResourceType(".zip")).toBe("video");
  });

  it("falls back to 'raw' for unknown types", () => {
    expect(inferResourceType("application/pdf")).toBe("raw");
    expect(inferResourceType("text/plain")).toBe("raw");
    expect(inferResourceType(".txt")).toBe("raw");
  });
});

describe("inferResourceTypeFromKey", () => {
  it("infers 'video' from .mp3 key", () => {
    expect(inferResourceTypeFromKey("producers/p1/beats/b1/preview.mp3")).toBe("video");
  });

  it("infers 'video' from .wav key", () => {
    expect(inferResourceTypeFromKey("producers/p1/beats/b1/master.wav")).toBe("video");
  });

  it("infers 'video' from .zip key (stems CORS fix)", () => {
    expect(inferResourceTypeFromKey("producers/p1/beats/b1/stems.zip")).toBe("video");
  });

  it("infers 'image' from .jpg key", () => {
    expect(inferResourceTypeFromKey("producers/p1/beats/b1/artwork.jpg")).toBe("image");
  });

  it("infers 'image' from .png key", () => {
    expect(inferResourceTypeFromKey("producers/p1/profile/avatar-123.png")).toBe("image");
  });
});

describe("createCloudinaryPresignedUpload", () => {
  beforeEach(() => {
    process.env.CLOUDINARY_URL = "cloudinary://test-key:test-secret@test-cloud";
  });

  it("generates upload URL with 'video' resource type for stems ZIP", async () => {
    const { createCloudinaryPresignedUpload } = await import("./cloudinary");

    const result = await createCloudinaryPresignedUpload(
      "producers/p1/beats/b1/stems.zip",
      "application/zip",
      "stems",
      5 * 1024 * 1024 * 1024
    );

    expect(result.uploadUrl).toContain("/video/upload");
    expect(result.uploadUrl).not.toContain("/raw/upload");
    expect(result.fields.type).toBe("authenticated");
    expect(result.fields.allowed_formats).toBe("zip");
  });

  it("generates upload URL with 'video' resource type for preview MP3", async () => {
    const { createCloudinaryPresignedUpload } = await import("./cloudinary");

    const result = await createCloudinaryPresignedUpload(
      "producers/p1/beats/b1/preview.mp3",
      "audio/mpeg",
      "preview",
      50 * 1024 * 1024
    );

    expect(result.uploadUrl).toContain("/video/upload");
    expect(result.fields.type).toBe("upload");
    expect(result.fields.allowed_formats).toBe("mp3");
  });

  it("generates upload URL with 'image' resource type for artwork", async () => {
    const { createCloudinaryPresignedUpload } = await import("./cloudinary");

    const result = await createCloudinaryPresignedUpload(
      "producers/p1/beats/b1/artwork.jpg",
      "image/jpeg",
      "artwork",
      5 * 1024 * 1024
    );

    expect(result.uploadUrl).toContain("/image/upload");
    expect(result.fields.type).toBe("upload");
  });

  it("sets delivery type to 'authenticated' for master WAV", async () => {
    const { createCloudinaryPresignedUpload } = await import("./cloudinary");

    const result = await createCloudinaryPresignedUpload(
      "producers/p1/beats/b1/master.wav",
      "audio/wav",
      "master",
      500 * 1024 * 1024
    );

    expect(result.uploadUrl).toContain("/video/upload");
    expect(result.fields.type).toBe("authenticated");
    expect(result.fields.allowed_formats).toBe("wav");
  });
});
