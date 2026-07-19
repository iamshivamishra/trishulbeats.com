import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn(),
}));

vi.mock("@/lib/models/like.model", () => ({
  Like: {
    findOne: vi.fn(),
    create: vi.fn(),
    findOneAndDelete: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import { Like } from "@/lib/models/like.model";
import { likeRepository } from "./like.repository";

describe("likeRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when duplicate like is created", async () => {
    vi.mocked(Like.create).mockRejectedValueOnce({ code: 11000 });

    const created = await likeRepository.createLike("user_1", "beat_1");

    expect(created).toBe(false);
  });

  it("toggleLike stays liked on duplicate create race", async () => {
    vi.mocked(Like.findOneAndDelete).mockResolvedValueOnce(null);
    vi.mocked(Like.create).mockRejectedValueOnce({ code: 11000 });

    const result = await likeRepository.toggleLike("user_1", "beat_1");

    expect(result).toEqual({ liked: true });
  });
});
