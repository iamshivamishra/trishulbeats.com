import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/pack-cart.repository", () => ({
  packCartRepository: {
    findByUser: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    findOne: vi.fn(),
    updateTier: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat-pack.repository", () => ({
  beatPackRepository: {
    findById: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    hasPurchased: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => ({
  NotFoundError: class NotFoundError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "NotFoundError";
    }
  },
  ConflictError: class ConflictError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ConflictError";
    }
  },
}));

import { packCartService } from "./pack-cart.service";
import { packCartRepository } from "@/lib/repositories/pack-cart.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { NotFoundError, ConflictError } from "@/lib/errors";

describe("packCartService", () => {
  const userId = "user-1";
  const packId = "pack-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getItems", () => {
    it("returns populated items and prunes unpublished packs", async () => {
      // Arrange
      vi.mocked(packCartRepository.findByUser).mockResolvedValue([
        { packId: { toString: () => "pack-1" }, tier: "basic" },
        { packId: { toString: () => "pack-2" }, tier: "premium" },
      ] as never);
      vi.mocked(beatPackRepository.findByIds).mockResolvedValue([
        {
          _id: { toString: () => "pack-1" },
          title: "Pack 1",
          isPublished: true,
          status: "published",
          producerId: { toString: () => "prod-1" },
          prices: { basic: 30 },
          beatIds: ["b1", "b2"],
        },
      ] as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue([
        { _id: { toString: () => "prod-1" }, displayName: "Producer 1" },
      ] as never);
      vi.mocked(packCartRepository.remove).mockResolvedValue(undefined as never);

      // Act
      const items = await packCartService.getItems(userId);

      // Assert
      expect(items).toHaveLength(1);
      expect(items[0].packTitle).toBe("Pack 1");
      expect(packCartRepository.remove).toHaveBeenCalledWith(userId, "pack-2");
    });
  });

  describe("addItem", () => {
    const validPack = {
      _id: { toString: () => packId },
      isPublished: true,
      status: "published",
      beatIds: [{ toString: () => "beat-1" }, { toString: () => "beat-2" }],
      producerId: { toString: () => "prod-1" },
    };

    it("adds item when pack is valid and not all owned", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(validPack as never);
      vi.mocked(purchaseRepository.hasPurchased)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      vi.mocked(packCartRepository.add).mockResolvedValue(undefined as never);

      // Act
      await packCartService.addItem(userId, packId, "basic");

      // Assert
      expect(packCartRepository.add).toHaveBeenCalledWith(userId, packId, "basic");
    });

    it("throws NotFoundError when pack not found", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(null as never);

      // Act & Assert
      await expect(packCartService.addItem(userId, packId, "basic")).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws NotFoundError when pack is not published", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue({
        ...validPack,
        isPublished: false,
        status: "draft",
      } as never);

      // Act & Assert
      await expect(packCartService.addItem(userId, packId, "basic")).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws ConflictError when pack has no beats", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue({
        ...validPack,
        beatIds: [],
      } as never);

      // Act & Assert
      await expect(packCartService.addItem(userId, packId, "basic")).rejects.toThrow(
        ConflictError
      );
    });

    it("throws ConflictError when all beats already owned", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(validPack as never);
      vi.mocked(purchaseRepository.hasPurchased).mockResolvedValue(true);

      // Act & Assert
      await expect(packCartService.addItem(userId, packId, "basic")).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe("updateTier", () => {
    it("updates tier when item exists", async () => {
      // Arrange
      vi.mocked(packCartRepository.findOne).mockResolvedValue({ packId, tier: "basic" } as never);
      vi.mocked(packCartRepository.updateTier).mockResolvedValue(undefined as never);

      // Act
      await packCartService.updateTier(userId, packId, "premium");

      // Assert
      expect(packCartRepository.updateTier).toHaveBeenCalledWith(userId, packId, "premium");
    });

    it("throws NotFoundError when item does not exist", async () => {
      // Arrange
      vi.mocked(packCartRepository.findOne).mockResolvedValue(null as never);

      // Act & Assert
      await expect(packCartService.updateTier(userId, packId, "premium")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("removeItem", () => {
    it("removes item from pack cart", async () => {
      // Arrange
      vi.mocked(packCartRepository.remove).mockResolvedValue(undefined as never);

      // Act
      await packCartService.removeItem(userId, packId);

      // Assert
      expect(packCartRepository.remove).toHaveBeenCalledWith(userId, packId);
    });
  });

  describe("clear", () => {
    it("clears all items for user", async () => {
      // Arrange
      vi.mocked(packCartRepository.clear).mockResolvedValue(undefined as never);

      // Act
      await packCartService.clear(userId);

      // Assert
      expect(packCartRepository.clear).toHaveBeenCalledWith(userId);
    });
  });
});
