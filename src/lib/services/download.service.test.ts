import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    hasPurchased: vi.fn(),
    findByBuyerAndBeat: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    SIGNED_URL_TTL_SECONDS: 900,
    getDownloadUrl: vi.fn(),
  },
}));

vi.mock("@/lib/security/entitlements", () => ({
  resolvePurchaseEntitlements: vi.fn(() => ({
    wavAllowed: true,
    stemsAllowed: true,
    licenseMatchesBeat: true,
  })),
}));

vi.mock("@/lib/storage/r2", () => ({
  getSignedDownloadUrl: vi.fn(async () => "https://signed.example.com/master"),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/lib/errors", () => {
  class ForbiddenError extends Error {}
  class NotFoundError extends Error {}
  return { ForbiddenError, NotFoundError };
});

import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { storageService } from "@/lib/services/storage.service";
import { downloadService } from "./download.service";

describe("downloadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.R2_PUBLIC_URL = "https://r2.example.com";
  });

  it("prefers storageKeys for signed URL generation", async () => {
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(true);
    vi.mocked(purchaseRepository.findByBuyerAndBeat).mockResolvedValueOnce([
      { licenseId: "license_1", licenseType: "premium" },
    ] as never);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({} as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Night Drive",
      audioTaggedUrl: "https://cdn.example.com/preview.mp3",
      audioFullUrl: "https://cdn.example.com/master.wav",
      status: "published",
      isPublished: true,
      genre: "Trap",
      tags: [],
      duration: 120,
      producerId: "producer_1",
      plays: 0,
      salesCount: 0,
      likesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      storageKeys: {
        master: "producers/p1/beats/b1/master.wav",
      },
    } as never);
    vi.mocked(storageService.getDownloadUrl).mockResolvedValueOnce("https://signed.example.com/master");

    const result = await downloadService.getSignedUrl("buyer_1", "beat_1", "master");

    expect(storageService.getDownloadUrl).toHaveBeenCalledWith(
      "producers/p1/beats/b1/master.wav",
      { expiresInSeconds: 900 }
    );
    expect(result.url).toBe("https://signed.example.com/master");
  });

  it("falls back to key extraction from R2 public URL when storageKeys missing", async () => {
    vi.stubEnv("R2_PUBLIC_URL", "https://pub-abc.r2.dev");
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(true);
    vi.mocked(purchaseRepository.findByBuyerAndBeat).mockResolvedValueOnce([
      { licenseId: "license_1", licenseType: "premium" },
    ] as never);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({} as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Night Drive",
      audioTaggedUrl: "https://pub-abc.r2.dev/producers/p1/beats/b1/preview.mp3",
      audioFullUrl: "https://pub-abc.r2.dev/producers/p1/beats/b1/master.wav",
      status: "published",
      isPublished: true,
      genre: "Trap",
      tags: [],
      duration: 120,
      producerId: "producer_1",
      plays: 0,
      salesCount: 0,
      likesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const { getSignedDownloadUrl: r2Download } = await import("@/lib/storage/r2");
    vi.mocked(r2Download).mockResolvedValueOnce("https://signed.example.com/master");

    const result = await downloadService.getSignedUrl("buyer_1", "beat_1", "master");

    expect(r2Download).toHaveBeenCalledWith(
      "producers/p1/beats/b1/master.wav",
      900
    );
    expect(result.url).toBe("https://signed.example.com/master");
  });
});
