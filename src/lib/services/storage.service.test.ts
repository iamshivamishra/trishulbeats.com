import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/storage/r2", () => ({
  uploadToR2: vi.fn(async () => "https://cdn.example.com/uploaded"),
  deleteFromR2: vi.fn(),
  getSignedDownloadUrl: vi.fn(async () => "https://cdn.example.com/signed"),
  getPublicUrl: vi.fn(() => "https://cdn.example.com/public"),
  createPresignedUploadUrl: vi.fn(async () => ({
    uploadUrl: "https://cdn.example.com/presigned",
    publicUrl: "https://cdn.example.com/public",
    key: "test-key",
  })),
}));

vi.mock("@/lib/storage/cloudinary", () => ({
  createCloudinaryPresignedUpload: vi.fn(async (_key: string, contentType: string) => {
    let rt = "raw";
    if (contentType.startsWith("audio/") || contentType.startsWith("video/")) rt = "video";
    else if (contentType.startsWith("image/")) rt = "image";
    else if (contentType === "application/zip" || contentType === "application/x-zip-compressed") rt = "video";
    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/test/${rt}/upload`,
      publicUrl: "https://cdn.example.com/public",
      key: "test-key",
      fields: { api_key: "key", timestamp: "123", signature: "sig", public_id: "id", type: "upload", allowed_formats: "zip", overwrite: "true" },
    };
  }),
  uploadToCloudinary: vi.fn(async () => "https://cdn.example.com/uploaded"),
  deleteFromCloudinary: vi.fn(),
  getCloudinarySignedDownloadUrl: vi.fn(() => "https://cdn.example.com/signed"),
  getCloudinaryUrl: vi.fn(() => "https://cdn.example.com/public"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe("storageService", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  describe("resourceTypeForCategory", () => {
    it("maps stems to 'video' (not 'raw')", async () => {
      process.env.STORAGE_PROVIDER = "cloudinary";
      const { storageService } = await import("./storage.service");
      const { uploadToCloudinary } = await import("@/lib/storage/cloudinary");

      const mockFile = new File(["zip-content"], "stems.zip", { type: "application/zip" });
      Object.defineProperty(mockFile, "size", { value: 100 * 1024 * 1024 });

      await storageService.uploadBeatFile(mockFile, "p1", "b1", "stems");

      expect(uploadToCloudinary).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining("stems"),
        "video"
      );
    });

    it("maps preview to 'video'", async () => {
      process.env.STORAGE_PROVIDER = "cloudinary";
      const { storageService } = await import("./storage.service");
      const { uploadToCloudinary } = await import("@/lib/storage/cloudinary");

      const mockFile = new File(["audio"], "preview.mp3", { type: "audio/mpeg" });
      Object.defineProperty(mockFile, "size", { value: 10 * 1024 * 1024 });

      await storageService.uploadBeatFile(mockFile, "p1", "b1", "preview");

      expect(uploadToCloudinary).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining("preview"),
        "video"
      );
    });

    it("maps master to 'video'", async () => {
      process.env.STORAGE_PROVIDER = "cloudinary";
      const { storageService } = await import("./storage.service");
      const { uploadToCloudinary } = await import("@/lib/storage/cloudinary");

      const mockFile = new File(["audio"], "master.wav", { type: "audio/wav" });
      Object.defineProperty(mockFile, "size", { value: 50 * 1024 * 1024 });

      await storageService.uploadBeatFile(mockFile, "p1", "b1", "master");

      expect(uploadToCloudinary).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining("master"),
        "video"
      );
    });

    it("maps artwork to 'image'", async () => {
      process.env.STORAGE_PROVIDER = "cloudinary";
      const { storageService } = await import("./storage.service");
      const { uploadToCloudinary } = await import("@/lib/storage/cloudinary");

      const mockFile = new File(["img"], "cover.jpg", { type: "image/jpeg" });
      Object.defineProperty(mockFile, "size", { value: 2 * 1024 * 1024 });

      await storageService.uploadBeatFile(mockFile, "p1", "b1", "artwork");

      expect(uploadToCloudinary).toHaveBeenCalledWith(
        expect.any(Buffer),
        expect.stringContaining("artwork"),
        "image"
      );
    });
  });

  describe("getPresignedUploadUrl", () => {
    it("validates file before generating presigned URL", async () => {
      process.env.STORAGE_PROVIDER = "cloudinary";
      const { storageService } = await import("./storage.service");

      await expect(
        storageService.getPresignedUploadUrl("p1", "b1", "stems", "text/plain", 1024)
      ).rejects.toThrow("Invalid file type");
    });

    it("validates file size before generating presigned URL", async () => {
      process.env.STORAGE_PROVIDER = "cloudinary";
      const { storageService } = await import("./storage.service");

      await expect(
        storageService.getPresignedUploadUrl("p1", "b1", "artwork", "image/jpeg", 10 * 1024 * 1024)
      ).rejects.toThrow("under");
    });

    it("generates presigned URL for valid stems upload", async () => {
      process.env.STORAGE_PROVIDER = "cloudinary";
      const { storageService } = await import("./storage.service");

      const result = await storageService.getPresignedUploadUrl(
        "p1", "b1", "stems", "application/zip", 100 * 1024 * 1024
      );

      expect(result.uploadUrl).toContain("/video/upload");
      expect(result.uploadUrl).not.toContain("/raw/upload");
    });
  });
});
