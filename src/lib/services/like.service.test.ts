import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => {
  class UnauthorizedError extends Error {
    statusCode = 401;
    constructor(message = "Authentication required") {
      super(message);
      this.name = "UnauthorizedError";
    }
  }

  class ForbiddenError extends Error {
    statusCode = 403;
    constructor(message = "You do not have permission to perform this action") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  class NotFoundError extends Error {
    statusCode = 404;
    constructor(resource: string) {
      super(`${resource} not found`);
      this.name = "NotFoundError";
    }
  }

  return {
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
  };
});

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(async (operation: (session: object) => Promise<unknown>) =>
    operation({})
  ),
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    incrementLikesCount: vi.fn(),
    decrementLikesCount: vi.fn(),
    setLikesCount: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/like.repository", () => ({
  likeRepository: {
    isLiked: vi.fn(),
    toggleLike: vi.fn(),
    countByBeat: vi.fn(),
  },
}));

vi.mock("@/lib/security/object-id", () => ({
  toValidObjectIdOrNull: vi.fn((value: string) => ({
    toString: () => value,
  })),
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { likeRepository } from "@/lib/repositories/like.repository";
import { likeService } from "./like.service";

const sampleBeat = {
  _id: "507f1f77bcf86cd799439011",
  title: "Sample",
  producerId: "507f1f77bcf86cd799439012",
  genre: "Trap",
  tags: [],
  duration: 120,
  audioTaggedUrl: "https://example.com/preview.mp3",
  audioFullUrl: "https://example.com/full.wav",
  status: "published" as const,
  plays: 0,
  salesCount: 0,
  likesCount: 2,
  isPublished: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("likeService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks guests from toggling likes", async () => {
    await expect(likeService.toggleLike({}, sampleBeat._id)).rejects.toThrow("Authentication required");
  });

  it("blocks non-buyer roles from toggling likes", async () => {
    await expect(
      likeService.toggleLike({ userId: "507f1f77bcf86cd799439013", role: "producer" }, sampleBeat._id)
    ).rejects.toThrow("Only buyers can like beats");
  });

  it("increments count when beat is liked", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValueOnce(sampleBeat);
    vi.mocked(likeRepository.toggleLike).mockResolvedValueOnce({ liked: true });
    vi.mocked(likeRepository.countByBeat).mockResolvedValueOnce(3);

    const result = await likeService.toggleLike(
      { userId: "507f1f77bcf86cd799439013", role: "buyer" },
      sampleBeat._id
    );

    expect(result).toEqual({ liked: true, likesCount: 3 });
    expect(beatRepository.incrementLikesCount).toHaveBeenCalledWith(sampleBeat._id, expect.anything());
    expect(beatRepository.decrementLikesCount).not.toHaveBeenCalled();
    expect(likeRepository.countByBeat).toHaveBeenCalledWith(sampleBeat._id, expect.anything());
    expect(beatRepository.setLikesCount).toHaveBeenCalledWith(sampleBeat._id, 3, expect.anything());
  });

  it("returns guest state with visible count", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValueOnce(sampleBeat);
    vi.mocked(likeRepository.countByBeat).mockResolvedValueOnce(2);

    const result = await likeService.getLikeState(sampleBeat._id);

    expect(result).toEqual({ liked: false, likesCount: 2 });
    expect(likeRepository.isLiked).not.toHaveBeenCalled();
  });
});
