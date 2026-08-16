import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/follow.model", () => ({
  Follow: {
    findOne: vi.fn(),
    updateOne: vi.fn(),
    findOneAndDelete: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import { Follow } from "@/lib/models/follow.model";
import { followRepository } from "./follow.repository";

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

describe("followRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isFollowing", () => {
    it("returns true when relation exists", async () => {
      vi.mocked(Follow.findOne).mockReturnValue(chainable({ _id: "f1" }) as never);

      const result = await followRepository.isFollowing("user1", "producer1");

      expect(result).toBe(true);
      expect(Follow.findOne).toHaveBeenCalledWith({
        follower: "user1",
        following: "producer1",
      });
    });

    it("returns false when not found", async () => {
      vi.mocked(Follow.findOne).mockReturnValue(chainable(null) as never);

      const result = await followRepository.isFollowing("user1", "producer1");

      expect(result).toBe(false);
    });
  });

  describe("follow", () => {
    it("returns true when upserted", async () => {
      vi.mocked(Follow.updateOne).mockResolvedValue({ upsertedCount: 1 } as never);

      const result = await followRepository.follow("user1", "producer1");

      expect(result).toBe(true);
      expect(Follow.updateOne).toHaveBeenCalledWith(
        { follower: "user1", following: "producer1" },
        { $setOnInsert: { follower: "user1", following: "producer1", createdAt: expect.any(Date) } },
        { upsert: true, session: undefined }
      );
    });

    it("returns false when already following", async () => {
      vi.mocked(Follow.updateOne).mockResolvedValue({ upsertedCount: 0 } as never);

      const result = await followRepository.follow("user1", "producer1");

      expect(result).toBe(false);
    });
  });

  describe("unfollow", () => {
    it("returns true when deleted", async () => {
      vi.mocked(Follow.findOneAndDelete).mockReturnValue(
        chainable({ _id: "f1" }) as never
      );

      const result = await followRepository.unfollow("user1", "producer1");

      expect(result).toBe(true);
      expect(Follow.findOneAndDelete).toHaveBeenCalledWith({
        follower: "user1",
        following: "producer1",
      });
    });

    it("returns false when not following", async () => {
      vi.mocked(Follow.findOneAndDelete).mockReturnValue(chainable(null) as never);

      const result = await followRepository.unfollow("user1", "producer1");

      expect(result).toBe(false);
    });
  });

  describe("countFollowers", () => {
    it("returns number of followers", async () => {
      vi.mocked(Follow.countDocuments).mockReturnValue(chainable(42) as never);

      const result = await followRepository.countFollowers("producer1");

      expect(result).toBe(42);
      expect(Follow.countDocuments).toHaveBeenCalledWith({ following: "producer1" });
    });
  });
});
