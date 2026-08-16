import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findByBeatId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteByBeatId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    countByLicense: vi.fn(),
    countByBeat: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "NotFoundError";
    }
  },
  ForbiddenError: class ForbiddenError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ForbiddenError";
    }
  },
  ConflictError: class ConflictError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ConflictError";
    }
  },
}));

vi.mock("@/lib/validators/license", () => ({
  LICENSE_DEFAULTS: {
    basic: {
      name: "Basic License",
      price: 25,
      streamLimit: 5000,
      includesWav: false,
      includesStems: false,
      commercialUse: false,
      terms: "Basic terms",
    },
    premium: {
      name: "Premium License",
      price: 50,
      streamLimit: 50000,
      includesWav: true,
      includesStems: false,
      commercialUse: true,
      terms: "Premium terms",
    },
    unlimited: {
      name: "Unlimited License",
      price: 100,
      streamLimit: -1,
      includesWav: true,
      includesStems: true,
      commercialUse: true,
      terms: "Unlimited terms",
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { licenseService } from "./license.service";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { NotFoundError, ForbiddenError, ConflictError } from "@/lib/errors";

describe("licenseService", () => {
  const userId = "user-1";
  const beatId = "beat-1";
  const licenseId = "license-1";

  const mockBeat = {
    _id: { toString: () => beatId },
    producerId: { toString: () => userId },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getForBeat", () => {
    it("returns licenses for a beat", async () => {
      // Arrange
      const licenses = [{ _id: licenseId, type: "basic" }];
      vi.mocked(licenseRepository.findByBeatId).mockResolvedValue(licenses as never);

      // Act
      const result = await licenseService.getForBeat(beatId);

      // Assert
      expect(licenseRepository.findByBeatId).toHaveBeenCalledWith(beatId, true);
      expect(result).toEqual(licenses);
    });

    it("passes activeOnly parameter", async () => {
      // Arrange
      vi.mocked(licenseRepository.findByBeatId).mockResolvedValue([] as never);

      // Act
      await licenseService.getForBeat(beatId, false);

      // Assert
      expect(licenseRepository.findByBeatId).toHaveBeenCalledWith(beatId, false);
    });
  });

  describe("getById", () => {
    it("returns license when found", async () => {
      // Arrange
      const license = { _id: licenseId, type: "basic" };
      vi.mocked(licenseRepository.findById).mockResolvedValue(license as never);

      // Act
      const result = await licenseService.getById(licenseId);

      // Assert
      expect(result).toEqual(license);
    });

    it("throws NotFoundError when not found", async () => {
      // Arrange
      vi.mocked(licenseRepository.findById).mockResolvedValue(null as never);

      // Act & Assert
      await expect(licenseService.getById(licenseId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("create", () => {
    const input = {
      beatId,
      type: "basic" as const,
      price: 30,
      terms: "Custom terms",
    };

    it("creates license with defaults when valid", async () => {
      // Arrange
      vi.mocked(beatRepository.findById).mockResolvedValue(mockBeat as never);
      vi.mocked(licenseRepository.findByBeatId).mockResolvedValue([] as never);
      const created = { _id: licenseId, ...input };
      vi.mocked(licenseRepository.create).mockResolvedValue(created as never);

      // Act
      const result = await licenseService.create(input as never, userId, "producer");

      // Assert
      expect(licenseRepository.create).toHaveBeenCalled();
      expect(result).toEqual(created);
    });

    it("throws ForbiddenError when user does not own the beat", async () => {
      // Arrange
      vi.mocked(beatRepository.findById).mockResolvedValue({
        ...mockBeat,
        producerId: { toString: () => "other-user" },
      } as never);

      // Act & Assert
      await expect(licenseService.create(input as never, userId, "producer")).rejects.toThrow(
        ForbiddenError
      );
    });

    it("throws ConflictError when duplicate license type exists", async () => {
      // Arrange
      vi.mocked(beatRepository.findById).mockResolvedValue(mockBeat as never);
      vi.mocked(licenseRepository.findByBeatId).mockResolvedValue([
        { type: "basic" },
      ] as never);

      // Act & Assert
      await expect(licenseService.create(input as never, userId, "producer")).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe("update", () => {
    it("updates license when owner", async () => {
      // Arrange
      const license = { _id: licenseId, beatId: { toString: () => beatId } };
      vi.mocked(licenseRepository.findById).mockResolvedValue(license as never);
      vi.mocked(beatRepository.findById).mockResolvedValue(mockBeat as never);
      const updated = { ...license, price: 40 };
      vi.mocked(licenseRepository.update).mockResolvedValue(updated as never);

      // Act
      const result = await licenseService.update(licenseId, { price: 40 } as never, userId, "producer");

      // Assert
      expect(licenseRepository.update).toHaveBeenCalledWith(licenseId, { price: 40 });
      expect(result).toEqual(updated);
    });
  });

  describe("delete", () => {
    it("deletes license when no purchases exist", async () => {
      // Arrange
      const license = { _id: licenseId, beatId: { toString: () => beatId } };
      vi.mocked(licenseRepository.findById).mockResolvedValue(license as never);
      vi.mocked(beatRepository.findById).mockResolvedValue(mockBeat as never);
      vi.mocked(purchaseRepository.countByLicense).mockResolvedValue(0);
      vi.mocked(licenseRepository.delete).mockResolvedValue(undefined as never);

      // Act
      await licenseService.delete(licenseId, userId, "producer");

      // Assert
      expect(licenseRepository.delete).toHaveBeenCalledWith(licenseId);
    });

    it("throws ConflictError when purchases exist", async () => {
      // Arrange
      const license = { _id: licenseId, beatId: { toString: () => beatId } };
      vi.mocked(licenseRepository.findById).mockResolvedValue(license as never);
      vi.mocked(beatRepository.findById).mockResolvedValue(mockBeat as never);
      vi.mocked(purchaseRepository.countByLicense).mockResolvedValue(3);

      // Act & Assert
      await expect(licenseService.delete(licenseId, userId, "producer")).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe("resetToDefaults", () => {
    it("resets licenses when no purchases exist", async () => {
      // Arrange
      vi.mocked(beatRepository.findById).mockResolvedValue(mockBeat as never);
      vi.mocked(purchaseRepository.countByBeat).mockResolvedValue(0);
      vi.mocked(licenseRepository.deleteByBeatId).mockResolvedValue(undefined as never);
      const defaults = [{ type: "basic" }, { type: "premium" }, { type: "unlimited" }];
      vi.mocked(licenseRepository.createMany).mockResolvedValue(defaults as never);

      // Act
      const result = await licenseService.resetToDefaults(beatId, userId, "producer");

      // Assert
      expect(licenseRepository.deleteByBeatId).toHaveBeenCalledWith(beatId);
      expect(licenseRepository.createMany).toHaveBeenCalled();
      expect(result).toEqual(defaults);
    });

    it("throws ConflictError when beat has purchases", async () => {
      // Arrange
      vi.mocked(beatRepository.findById).mockResolvedValue(mockBeat as never);
      vi.mocked(purchaseRepository.countByBeat).mockResolvedValue(5);

      // Act & Assert
      await expect(
        licenseService.resetToDefaults(beatId, userId, "producer")
      ).rejects.toThrow(ConflictError);
    });
  });
});
