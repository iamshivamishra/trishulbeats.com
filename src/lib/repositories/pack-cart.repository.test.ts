import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/PackCart", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  },
}));

import PackCartItem from "@/lib/models/PackCart";
import { packCartRepository } from "./pack-cart.repository";

function chainable(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.skip = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.session = vi.fn().mockReturnValue(chain);
  chain.populate = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const mockPackCartItem = {
  _id: "pcart1",
  userId: "user1",
  packId: "pack1",
  tier: "basic" as const,
  addedAt: new Date(),
};

describe("packCartRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByUser", () => {
    it("returns items for user", async () => {
      vi.mocked(PackCartItem.find).mockReturnValue(
        chainable([mockPackCartItem]) as never
      );

      const result = await packCartRepository.findByUser("user1");
      expect(result).toEqual([mockPackCartItem]);
    });
  });

  describe("findOne", () => {
    it("returns item when found", async () => {
      vi.mocked(PackCartItem.findOne).mockReturnValue(
        chainable(mockPackCartItem) as never
      );

      const result = await packCartRepository.findOne("user1", "pack1");
      expect(result).toEqual(mockPackCartItem);
    });

    it("returns null when not found", async () => {
      vi.mocked(PackCartItem.findOne).mockReturnValue(
        chainable(null) as never
      );

      const result = await packCartRepository.findOne("user1", "missing");
      expect(result).toBeNull();
    });
  });

  describe("add", () => {
    it("upserts pack cart item", async () => {
      vi.mocked(PackCartItem.findOneAndUpdate).mockReturnValue(
        chainable(mockPackCartItem) as never
      );

      const result = await packCartRepository.add("user1", "pack1", "basic");
      expect(result).toEqual(mockPackCartItem);
      expect(PackCartItem.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user1", packId: "pack1" },
        expect.objectContaining({
          userId: "user1",
          packId: "pack1",
          tier: "basic",
        }),
        { upsert: true, new: true }
      );
    });
  });

  describe("updateTier", () => {
    it("updates tier for item", async () => {
      const updated = { ...mockPackCartItem, tier: "premium" };
      vi.mocked(PackCartItem.findOneAndUpdate).mockReturnValue(
        chainable(updated) as never
      );

      const result = await packCartRepository.updateTier(
        "user1",
        "pack1",
        "premium"
      );
      expect(result).toEqual(updated);
      expect(PackCartItem.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user1", packId: "pack1" },
        { tier: "premium" },
        { new: true }
      );
    });
  });

  describe("remove", () => {
    it("returns true when item is deleted", async () => {
      vi.mocked(PackCartItem.deleteOne).mockResolvedValue({
        deletedCount: 1,
      } as never);

      const result = await packCartRepository.remove("user1", "pack1");
      expect(result).toBe(true);
    });

    it("returns false when item not found", async () => {
      vi.mocked(PackCartItem.deleteOne).mockResolvedValue({
        deletedCount: 0,
      } as never);

      const result = await packCartRepository.remove("user1", "missing");
      expect(result).toBe(false);
    });
  });

  describe("clear", () => {
    it("returns deleted count", async () => {
      vi.mocked(PackCartItem.deleteMany).mockResolvedValue({
        deletedCount: 3,
      } as never);

      const result = await packCartRepository.clear("user1");
      expect(result).toBe(3);
    });
  });
});
