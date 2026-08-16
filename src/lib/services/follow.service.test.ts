import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSession = { id: "mock-session" };

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn((cb: (session: unknown) => Promise<unknown>) => cb(mockSession)),
}));

vi.mock("@/lib/errors", () => ({
  ConflictError: class ConflictError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ConflictError";
    }
  },
}));

vi.mock("@/lib/repositories/follow.repository", () => ({
  followRepository: {
    follow: vi.fn(),
    unfollow: vi.fn(),
    isFollowing: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    incrementFollowersCount: vi.fn(),
    decrementFollowersCount: vi.fn(),
  },
}));

import { followService } from "./follow.service";
import { followRepository } from "@/lib/repositories/follow.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { ConflictError } from "@/lib/errors";

describe("followService", () => {
  const userId = "user-1";
  const producerId = "producer-1";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("follow", () => {
    it("throws ConflictError when user tries to follow themselves", async () => {
      // Act & Assert
      await expect(followService.follow(userId, userId)).rejects.toThrow(ConflictError);
    });

    it("creates follow and increments count when new follow", async () => {
      // Arrange
      vi.mocked(followRepository.follow).mockResolvedValue(true as never);
      vi.mocked(userRepository.incrementFollowersCount).mockResolvedValue(undefined as never);

      // Act
      const result = await followService.follow(userId, producerId);

      // Assert
      expect(followRepository.follow).toHaveBeenCalledWith(userId, producerId, { session: mockSession });
      expect(userRepository.incrementFollowersCount).toHaveBeenCalledWith(producerId, { session: mockSession });
      expect(result).toEqual({ following: true });
    });

    it("does not increment count when follow already existed", async () => {
      // Arrange
      vi.mocked(followRepository.follow).mockResolvedValue(false as never);
      vi.mocked(followRepository.isFollowing).mockResolvedValue(true as never);

      // Act
      const result = await followService.follow(userId, producerId);

      // Assert
      expect(userRepository.incrementFollowersCount).not.toHaveBeenCalled();
      expect(result).toEqual({ following: true });
    });
  });

  describe("unfollow", () => {
    it("removes follow and decrements count when follow existed", async () => {
      // Arrange
      vi.mocked(followRepository.unfollow).mockResolvedValue(true as never);
      vi.mocked(userRepository.decrementFollowersCount).mockResolvedValue(undefined as never);

      // Act
      const result = await followService.unfollow(userId, producerId);

      // Assert
      expect(followRepository.unfollow).toHaveBeenCalledWith(userId, producerId, { session: mockSession });
      expect(userRepository.decrementFollowersCount).toHaveBeenCalledWith(producerId, { session: mockSession });
      expect(result).toEqual({ following: false });
    });

    it("does not decrement count when follow did not exist", async () => {
      // Arrange
      vi.mocked(followRepository.unfollow).mockResolvedValue(false as never);

      // Act
      const result = await followService.unfollow(userId, producerId);

      // Assert
      expect(userRepository.decrementFollowersCount).not.toHaveBeenCalled();
      expect(result).toEqual({ following: false });
    });
  });
});
