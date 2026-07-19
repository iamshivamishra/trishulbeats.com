import { describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    getPresignedProfileUploadUrl: vi.fn(),
    getPresignedUploadUrl: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => Response.json({ error: "rate_limited" }, { status: 429 })),
}));

vi.mock("@/lib/errors", () => {
  class UnauthorizedError extends Error {
    statusCode = 401;
    constructor(message = "Authentication required") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  class ForbiddenError extends Error {
    statusCode = 403;
    constructor(message = "Forbidden") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  return {
    UnauthorizedError,
    ForbiddenError,
    formatErrorResponse: (error: unknown) => {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
      return Response.json({ error: "Request failed" }, { status: statusCode });
    },
  };
});

import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { POST } from "./route";

describe("POST /api/upload/presign", () => {
  it("returns 401 for guests", async () => {
    const mockedAuth = auth as unknown as Mock;
    mockedAuth.mockResolvedValueOnce(null);

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }) as unknown as NextRequest
    );

    expect(response.status).toBe(401);
  });

  it("uses session user id when producerId is omitted", async () => {
    const mockedAuth = auth as unknown as Mock;
    const mockedBeatPresign = storageService.getPresignedUploadUrl as unknown as Mock;

    mockedAuth.mockResolvedValueOnce({
      user: { id: "producer_1", role: "producer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    mockedBeatPresign.mockResolvedValueOnce({
      uploadUrl: "https://upload.example.com",
      publicUrl: "https://cdn.example.com/a.mp3",
      key: "producers/producer_1/beats/beat_1/preview.mp3",
    });

    const response = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beatId: "beat_1",
          category: "preview",
          contentType: "audio/mpeg",
          fileSize: 1024,
        }),
      }) as unknown as NextRequest
    );

    expect(response.status).toBe(200);
    expect(storageService.getPresignedUploadUrl).toHaveBeenCalledWith(
      "producer_1",
      "beat_1",
      "preview",
      "audio/mpeg",
      1024
    );
  });
});
