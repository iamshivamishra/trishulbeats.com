import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/BeatPack", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import BeatPack from "@/lib/models/BeatPack";
import { beatPackRepository } from "./beat-pack.repository";

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

const mockPack = {
  _id: "pack1",
  title: "Test Pack",
  producerId: "prod1",
  status: "published",
  isPublished: true,
  salesCount: 0,
  createdAt: new Date(),
};

describe("beatPackRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns created pack", async () => {
      vi.mocked(BeatPack.create).mockResolvedValue([
        { toObject: () => mockPack },
      ] as never);

      const result = await beatPackRepository.create({ title: "Test Pack" });
      expect(BeatPack.create).toHaveBeenCalledWith(
        [{ title: "Test Pack" }],
        { session: undefined }
      );
      expect(result).toEqual(mockPack);
    });
  });

  describe("findById", () => {
    it("returns pack when found", async () => {
      vi.mocked(BeatPack.findById).mockReturnValue(
        chainable(mockPack) as never
      );

      const result = await beatPackRepository.findById("pack1");
      expect(result).toEqual(mockPack);
    });

    it("returns null when not found", async () => {
      vi.mocked(BeatPack.findById).mockReturnValue(chainable(null) as never);

      const result = await beatPackRepository.findById("missing");
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("returns updated pack", async () => {
      const updated = { ...mockPack, title: "Updated Pack" };
      vi.mocked(BeatPack.findByIdAndUpdate).mockReturnValue(
        chainable(updated) as never
      );

      const result = await beatPackRepository.update("pack1", {
        title: "Updated Pack",
      });
      expect(BeatPack.findByIdAndUpdate).toHaveBeenCalledWith(
        "pack1",
        { title: "Updated Pack" },
        { new: true, session: undefined }
      );
      expect(result).toEqual(updated);
    });
  });

  describe("delete", () => {
    it("returns true when deleted", async () => {
      vi.mocked(BeatPack.findByIdAndDelete).mockResolvedValue(
        mockPack as never
      );

      const result = await beatPackRepository.delete("pack1");
      expect(result).toBe(true);
    });

    it("returns false when not found", async () => {
      vi.mocked(BeatPack.findByIdAndDelete).mockResolvedValue(null as never);

      const result = await beatPackRepository.delete("missing");
      expect(result).toBe(false);
    });
  });

  describe("listPublished", () => {
    it("paginates correctly", async () => {
      const packs = [mockPack];
      vi.mocked(BeatPack.find).mockReturnValue(chainable(packs) as never);
      vi.mocked(BeatPack.countDocuments).mockResolvedValue(1 as never);

      const result = await beatPackRepository.listPublished(1, 10);
      expect(result.data).toEqual(packs);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });

    it("calculates hasNext when more pages exist", async () => {
      vi.mocked(BeatPack.find).mockReturnValue(chainable([mockPack]) as never);
      vi.mocked(BeatPack.countDocuments).mockResolvedValue(25 as never);

      const result = await beatPackRepository.listPublished(1, 10);
      expect(result.hasNext).toBe(true);
      expect(result.totalPages).toBe(3);
    });
  });

  describe("listByProducer", () => {
    it("returns paginated results for producer", async () => {
      vi.mocked(BeatPack.find).mockReturnValue(
        chainable([mockPack]) as never
      );
      vi.mocked(BeatPack.countDocuments).mockResolvedValue(1 as never);

      const result = await beatPackRepository.listByProducer("prod1");
      expect(result.data).toEqual([mockPack]);
      expect(result.total).toBe(1);
    });
  });

  describe("findByIds", () => {
    it("returns empty array for empty ids", async () => {
      const result = await beatPackRepository.findByIds([]);
      expect(result).toEqual([]);
      expect(BeatPack.find).not.toHaveBeenCalled();
    });

    it("returns packs for given ids", async () => {
      vi.mocked(BeatPack.find).mockReturnValue(
        chainable([mockPack]) as never
      );

      const result = await beatPackRepository.findByIds(["pack1"]);
      expect(result).toEqual([mockPack]);
    });
  });

  describe("incrementSalesCount", () => {
    it("calls findByIdAndUpdate with $inc", async () => {
      vi.mocked(BeatPack.findByIdAndUpdate).mockResolvedValue(null as never);

      await beatPackRepository.incrementSalesCount("pack1");
      expect(BeatPack.findByIdAndUpdate).toHaveBeenCalledWith(
        "pack1",
        { $inc: { salesCount: 1 } },
        { session: undefined }
      );
    });
  });
});
