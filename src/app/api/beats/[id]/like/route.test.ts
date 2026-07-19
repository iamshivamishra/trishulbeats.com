import { describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => ({
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
}));

vi.mock("@/lib/services/like.service", () => ({
  likeService: {
    getLikeState: vi.fn(),
    toggleLike: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { likeService } from "@/lib/services/like.service";
import { POST } from "./route";

describe("POST /api/beats/[id]/like", () => {
  it("returns 401 for guests", async () => {
    const mockedAuth = auth as unknown as Mock;
    const mockedToggle = likeService.toggleLike as unknown as Mock;
    mockedAuth.mockResolvedValueOnce(null);
    mockedToggle.mockRejectedValueOnce({ statusCode: 401 });

    const response = await POST(new Request("http://localhost") as unknown as NextRequest, {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
    });

    expect(response.status).toBe(401);
  });

  it("returns toggled state for buyer", async () => {
    const mockedAuth = auth as unknown as Mock;
    const mockedToggle = likeService.toggleLike as unknown as Mock;
    mockedAuth.mockResolvedValueOnce({
      user: { id: "507f1f77bcf86cd799439012", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    mockedToggle.mockResolvedValueOnce({ liked: true, likesCount: 9 });

    const response = await POST(new Request("http://localhost") as unknown as NextRequest, {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ liked: true, likesCount: 9 });
  });

  it("returns 403 for producer/admin", async () => {
    const mockedAuth = auth as unknown as Mock;
    const mockedToggle = likeService.toggleLike as unknown as Mock;
    mockedAuth.mockResolvedValueOnce({
      user: { id: "507f1f77bcf86cd799439012", role: "producer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    mockedToggle.mockRejectedValueOnce({ statusCode: 403 });

    const response = await POST(new Request("http://localhost") as unknown as NextRequest, {
      params: Promise.resolve({ id: "507f1f77bcf86cd799439011" }),
    });

    expect(response.status).toBe(403);
  });
});
