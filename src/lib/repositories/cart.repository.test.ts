import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/Cart", () => ({
  default: {
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import CartItem from "@/lib/models/Cart";
import { cartRepository } from "./cart.repository";

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

const mockCartItem = {
  _id: "cart1",
  userId: "user1",
  beatId: "beat1",
  licenseId: "lic1",
  addedAt: new Date(),
};

describe("cartRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByUser", () => {
    it("returns items for user", async () => {
      vi.mocked(CartItem.find).mockReturnValue(
        chainable([mockCartItem]) as never
      );

      const result = await cartRepository.findByUser("user1");
      expect(result).toEqual([mockCartItem]);
    });
  });

  describe("findOne", () => {
    it("returns item when found", async () => {
      vi.mocked(CartItem.findOne).mockReturnValue(
        chainable(mockCartItem) as never
      );

      const result = await cartRepository.findOne("user1", "beat1");
      expect(result).toEqual(mockCartItem);
    });

    it("returns null when not found", async () => {
      vi.mocked(CartItem.findOne).mockReturnValue(chainable(null) as never);

      const result = await cartRepository.findOne("user1", "missing");
      expect(result).toBeNull();
    });
  });

  describe("add", () => {
    it("upserts cart item", async () => {
      vi.mocked(CartItem.findOneAndUpdate).mockReturnValue(
        chainable(mockCartItem) as never
      );

      const result = await cartRepository.add("user1", "beat1", "lic1");
      expect(result).toEqual(mockCartItem);
      expect(CartItem.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: "user1", beatId: "beat1" },
        expect.objectContaining({
          userId: "user1",
          beatId: "beat1",
          licenseId: "lic1",
        }),
        { upsert: true, new: true }
      );
    });
  });

  describe("updateLicense", () => {
    it("updates license for item", async () => {
      const updated = { ...mockCartItem, licenseId: "lic2" };
      vi.mocked(CartItem.findOneAndUpdate).mockReturnValue(
        chainable(updated) as never
      );

      const result = await cartRepository.updateLicense(
        "user1",
        "beat1",
        "lic2"
      );
      expect(result).toEqual(updated);
    });
  });

  describe("remove", () => {
    it("returns true when item is deleted", async () => {
      vi.mocked(CartItem.deleteOne).mockResolvedValue({
        deletedCount: 1,
      } as never);

      const result = await cartRepository.remove("user1", "beat1");
      expect(result).toBe(true);
    });

    it("returns false when item not found", async () => {
      vi.mocked(CartItem.deleteOne).mockResolvedValue({
        deletedCount: 0,
      } as never);

      const result = await cartRepository.remove("user1", "missing");
      expect(result).toBe(false);
    });
  });

  describe("clear", () => {
    it("returns deleted count", async () => {
      vi.mocked(CartItem.deleteMany).mockResolvedValue({
        deletedCount: 3,
      } as never);

      const result = await cartRepository.clear("user1");
      expect(result).toBe(3);
    });
  });

  describe("count", () => {
    it("returns number of items", async () => {
      vi.mocked(CartItem.countDocuments).mockResolvedValue(2 as never);

      const result = await cartRepository.count("user1");
      expect(result).toBe(2);
      expect(CartItem.countDocuments).toHaveBeenCalledWith({ userId: "user1" });
    });
  });
});
