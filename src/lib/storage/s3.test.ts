import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSend = vi.fn();
const mockGetSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class S3Client { send = mockSend; }
  class PutObjectCommand { constructor(public input: unknown) {} }
  class DeleteObjectCommand { constructor(public input: unknown) {} }
  class GetObjectCommand { constructor(public input: unknown) {} }
  class CreateMultipartUploadCommand { constructor(public input: unknown) {} }
  class UploadPartCommand { constructor(public input: unknown) {} }
  class CompleteMultipartUploadCommand { constructor(public input: unknown) {} }
  class AbortMultipartUploadCommand { constructor(public input: unknown) {} }
  return {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    GetObjectCommand,
    CreateMultipartUploadCommand,
    UploadPartCommand,
    CompleteMultipartUploadCommand,
    AbortMultipartUploadCommand,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn() },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("AWS_S3_REGION", "ap-south-1");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "AKIATEST");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "secret123");
  vi.stubEnv("AWS_S3_BUCKET", "test-bucket");
  vi.stubEnv("AWS_S3_PUBLIC_URL", "https://cdn.example.com");
  vi.resetModules();
});

describe("createPresignedUploadUrl", () => {
  it("returns upload URL, public URL and key", async () => {
    mockGetSignedUrl.mockResolvedValue("https://s3.signed/upload");
    const { createPresignedUploadUrl } = await import("./s3");

    const result = await createPresignedUploadUrl("test/key.mp3", "audio/mpeg", 50_000_000);
    expect(result.uploadUrl).toBe("https://s3.signed/upload");
    expect(result.publicUrl).toBe("https://cdn.example.com/test/key.mp3");
    expect(result.key).toBe("test/key.mp3");
  });
});

describe("uploadToS3", () => {
  it("uploads buffer and returns public URL", async () => {
    mockSend.mockResolvedValue({});
    const { uploadToS3 } = await import("./s3");

    const url = await uploadToS3(Buffer.from("data"), "test/key.wav", "audio/wav");
    expect(url).toBe("https://cdn.example.com/test/key.wav");
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("deleteFromS3", () => {
  it("sends delete command", async () => {
    mockSend.mockResolvedValue({});
    const { deleteFromS3 } = await import("./s3");

    await deleteFromS3("test/key.mp3");
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("getSignedDownloadUrl", () => {
  it("returns signed URL", async () => {
    mockGetSignedUrl.mockResolvedValue("https://s3.signed/download");
    const { getSignedDownloadUrl } = await import("./s3");

    const url = await getSignedDownloadUrl("test/key.mp3");
    expect(url).toBe("https://s3.signed/download");
  });
});

describe("getPublicUrl", () => {
  it("returns public URL using base URL", async () => {
    const { getPublicUrl } = await import("./s3");
    expect(getPublicUrl("test/key.mp3")).toBe("https://cdn.example.com/test/key.mp3");
  });
});

describe("MULTIPART_PART_SIZE", () => {
  it("is 10 MB", async () => {
    const { MULTIPART_PART_SIZE } = await import("./s3");
    expect(MULTIPART_PART_SIZE).toBe(10 * 1024 * 1024);
  });
});

describe("createMultipartUpload", () => {
  it("returns uploadId, key, publicUrl", async () => {
    mockSend.mockResolvedValue({ UploadId: "upload-123" });
    const { createMultipartUpload } = await import("./s3");

    const result = await createMultipartUpload("test/key.zip", "application/zip");
    expect(result.uploadId).toBe("upload-123");
    expect(result.key).toBe("test/key.zip");
    expect(result.publicUrl).toBe("https://cdn.example.com/test/key.zip");
  });

  it("throws when UploadId is missing", async () => {
    mockSend.mockResolvedValue({});
    const { createMultipartUpload } = await import("./s3");

    await expect(createMultipartUpload("key", "type")).rejects.toThrow("Failed to initiate");
  });
});

describe("getPartPresignedUrls", () => {
  it("returns one URL per part", async () => {
    mockGetSignedUrl.mockResolvedValue("https://s3.signed/part");
    const { getPartPresignedUrls } = await import("./s3");

    const urls = await getPartPresignedUrls("key", "upload-1", 3);
    expect(urls).toHaveLength(3);
    expect(urls.every((u: string) => u === "https://s3.signed/part")).toBe(true);
  });
});

describe("completeMultipartUpload", () => {
  it("sends complete command and returns URL", async () => {
    mockSend.mockResolvedValue({});
    const { completeMultipartUpload } = await import("./s3");

    const url = await completeMultipartUpload("key.zip", "upload-1", [
      { partNumber: 1, etag: '"etag1"' },
      { partNumber: 2, etag: '"etag2"' },
    ]);
    expect(url).toBe("https://cdn.example.com/key.zip");
    expect(mockSend).toHaveBeenCalledOnce();
  });
});

describe("abortMultipartUpload", () => {
  it("sends abort command", async () => {
    mockSend.mockResolvedValue({});
    const { abortMultipartUpload } = await import("./s3");

    await abortMultipartUpload("key.zip", "upload-1");
    expect(mockSend).toHaveBeenCalledOnce();
  });
});
