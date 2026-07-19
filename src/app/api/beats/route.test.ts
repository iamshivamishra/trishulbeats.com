import { describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/beat.service", () => ({
  beatService: {
    create: vi.fn(),
  },
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    uploadBeatFile: vi.fn(),
  },
}));

vi.mock("@/lib/storage/config", () => ({
  validateFile: vi.fn(() => ({ valid: true })),
}));

vi.mock("@/lib/validators/beat", () => ({
  createBeatSchema: {
    parse: vi.fn((value) => value),
  },
  beatFilterSchema: {
    parse: vi.fn((value) => value),
  },
}));

vi.mock("@/lib/errors", () => {
  class UnauthorizedError extends Error {
    statusCode = 401;
  }
  class ForbiddenError extends Error {
    statusCode = 403;
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
      const message =
        error instanceof Error ? error.message : "Request failed";
      return Response.json({ error: message }, { status: statusCode });
    },
  };
});

import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { POST } from "./route";

describe("POST /api/beats", () => {
  it("rejects JSON uploads without uploadedAssets", async () => {
    const mockedAuth = auth as unknown as Mock;
    mockedAuth.mockResolvedValueOnce({
      user: { id: "producer_1", role: "producer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });

    const request = {
      headers: {
        get: () => "application/json",
      },
      json: async () => ({ title: "A", genre: "Trap", status: "draft", tags: [] }),
    } as unknown as NextRequest;
    const response = await POST(request);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("creates beat from JSON uploadedAssets payload", async () => {
    const mockedAuth = auth as unknown as Mock;
    const mockedCreate = beatService.create as unknown as Mock;

    mockedAuth.mockResolvedValueOnce({
      user: { id: "producer_1", role: "producer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    mockedCreate.mockResolvedValueOnce({ _id: "beat_1" });

    const request = {
      headers: {
        get: () => "application/json",
      },
      json: async () => ({
        title: "Night Drive",
        genre: "Trap",
        status: "draft",
        tags: [],
        uploadedAssets: {
          preview: {
            url: "https://res.cloudinary.com/demo/video/upload/v1/producers/producer_1/beats/beat_1/preview.mp3",
            key: "producers/producer_1/beats/beat_1/preview.mp3",
          },
          master: {
            url: "https://res.cloudinary.com/demo/video/upload/v1/producers/producer_1/beats/beat_1/master.wav",
            key: "producers/producer_1/beats/beat_1/master.wav",
          },
        },
      }),
    } as unknown as NextRequest;
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(beatService.create).toHaveBeenCalled();
  });
});
