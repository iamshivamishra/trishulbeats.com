import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/cart.repository", () => ({
  cartRepository: {
    findByUser: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    count: vi.fn(),
    findOne: vi.fn(),
    updateLicense: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
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

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { cartService } from "./cart.service";
import { cartRepository } from "@/lib/repositories/cart.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { NotFoundError, ConflictError } from "@/lib/errors";

describe("cartService", () => {
  const userId = "user-1";
  const beatId = "beat-1";
  const licenseId = "license-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("addItem", () => {
    const validBeat = {
      _id: { toString: () => beatId },
      isPublished: true,
      status: "published",
      saleMode: "individual",
      producerId: { toString: () => "producer-1" },
    };
    const validLicense = {
      _id: { toString: () => licenseId },
      isActive: true,
      beatId: { toString: () => beatId },
    };

    it("adds item when all validations pass", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(0);
      vi.mocked(beatRepository.findById).mockResolvedValue(validBeat as never);
      vi.mocked(licenseRepository.findById).mockResolvedValue(validLicense as never);
      vi.mocked(purchaseRepository.hasPurchased).mockResolvedValue(false);
      vi.mocked(cartRepository.add).mockResolvedValue(undefined);

      // Act
      await cartService.addItem(userId, beatId, licenseId);

      // Assert
      expect(cartRepository.add).toHaveBeenCalledWith(userId, beatId, licenseId);
    });

    it("throws ConflictError when cart is at max capacity", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(50);

      // Act & Assert
      await expect(cartService.addItem(userId, beatId, licenseId)).rejects.toThrow(
        ConflictError
      );
    });

    it("throws NotFoundError when beat not found", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(0);
      vi.mocked(beatRepository.findById).mockResolvedValue(null as never);

      // Act & Assert
      await expect(cartService.addItem(userId, beatId, licenseId)).rejects.toThrow(
        NotFoundError
      );
    });

    it("throws ConflictError when beat is not published", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(0);
      vi.mocked(beatRepository.findById).mockResolvedValue({
        ...validBeat,
        isPublished: false,
        status: "draft",
      } as never);

      // Act & Assert
      await expect(cartService.addItem(userId, beatId, licenseId)).rejects.toThrow(
        ConflictError
      );
    });

    it("throws ConflictError when beat is pack_only", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(0);
      vi.mocked(beatRepository.findById).mockResolvedValue({
        ...validBeat,
        saleMode: "pack_only",
      } as never);

      // Act & Assert
      await expect(cartService.addItem(userId, beatId, licenseId)).rejects.toThrow(
        ConflictError
      );
    });

    it("throws ConflictError when license is not active", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(0);
      vi.mocked(beatRepository.findById).mockResolvedValue(validBeat as never);
      vi.mocked(licenseRepository.findById).mockResolvedValue({
        ...validLicense,
        isActive: false,
      } as never);

      // Act & Assert
      await expect(cartService.addItem(userId, beatId, licenseId)).rejects.toThrow(
        ConflictError
      );
    });

    it("throws ConflictError when license belongs to wrong beat", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(0);
      vi.mocked(beatRepository.findById).mockResolvedValue(validBeat as never);
      vi.mocked(licenseRepository.findById).mockResolvedValue({
        ...validLicense,
        beatId: { toString: () => "other-beat" },
      } as never);

      // Act & Assert
      await expect(cartService.addItem(userId, beatId, licenseId)).rejects.toThrow(
        ConflictError
      );
    });

    it("throws ConflictError when beat already purchased", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(0);
      vi.mocked(beatRepository.findById).mockResolvedValue(validBeat as never);
      vi.mocked(licenseRepository.findById).mockResolvedValue(validLicense as never);
      vi.mocked(purchaseRepository.hasPurchased).mockResolvedValue(true);

      // Act & Assert
      await expect(cartService.addItem(userId, beatId, licenseId)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe("removeItem", () => {
    it("removes item from cart", async () => {
      // Arrange
      vi.mocked(cartRepository.remove).mockResolvedValue(undefined as never);

      // Act
      await cartService.removeItem(userId, beatId);

      // Assert
      expect(cartRepository.remove).toHaveBeenCalledWith(userId, beatId);
    });
  });

  describe("clearCart", () => {
    it("clears all items for user", async () => {
      // Arrange
      vi.mocked(cartRepository.clear).mockResolvedValue(undefined as never);

      // Act
      await cartService.clearCart(userId);

      // Assert
      expect(cartRepository.clear).toHaveBeenCalledWith(userId);
    });
  });

  describe("getCount", () => {
    it("returns item count from repository", async () => {
      // Arrange
      vi.mocked(cartRepository.count).mockResolvedValue(3);

      // Act
      const result = await cartService.getCount(userId);

      // Assert
      expect(result).toBe(3);
    });
  });

  describe("getTotal", () => {
    it("returns sum of item prices", async () => {
      // Arrange
      vi.mocked(cartRepository.findByUser).mockResolvedValue([
        { beatId: { toString: () => "b1" }, licenseId: { toString: () => "l1" } },
        { beatId: { toString: () => "b2" }, licenseId: { toString: () => "l2" } },
      ] as never);
      vi.mocked(beatRepository.findByIds).mockResolvedValue([
        { _id: { toString: () => "b1" }, isPublished: true, status: "published", saleMode: "individual", producerId: { toString: () => "p1" }, title: "Beat 1", coverUrl: "", genre: "hip-hop" },
        { _id: { toString: () => "b2" }, isPublished: true, status: "published", saleMode: "individual", producerId: { toString: () => "p1" }, title: "Beat 2", coverUrl: "", genre: "trap" },
      ] as never);
      vi.mocked(licenseRepository.findByIds).mockResolvedValue([
        { _id: { toString: () => "l1" }, isActive: true, name: "Basic", type: "basic", price: 25 },
        { _id: { toString: () => "l2" }, isActive: true, name: "Premium", type: "premium", price: 50 },
      ] as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue([
        { _id: { toString: () => "p1" }, displayName: "Producer" },
      ] as never);

      // Act
      const total = await cartService.getTotal(userId);

      // Assert
      expect(total).toBe(75);
    });
  });
});
