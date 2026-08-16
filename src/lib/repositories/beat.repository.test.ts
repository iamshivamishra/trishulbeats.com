import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/Beat", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    countDocuments: vi.fn(),
    updateMany: vi.fn(),
  },
}));
vi.mock("@/lib/models/User", () => ({
  default: { find: vi.fn() },
}));

import Beat from "@/lib/models/Beat";
import User from "@/lib/models/User";
import { beatRepository } from "./beat.repository";

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

const mockBeat = {
  _id: "beat1",
  title: "Test Beat",
  genre: "Hip Hop",
  bpm: 140,
  producerId: "prod1",
  isPublished: true,
  plays: 10,
  createdAt: new Date(),
};

describe("beatRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findById", () => {
    it("returns a beat when found", async () => {
      vi.mocked(Beat.findById).mockReturnValue(chainable(mockBeat) as never);

      const result = await beatRepository.findById("beat1");
      expect(result).toEqual(mockBeat);
      expect(Beat.findById).toHaveBeenCalledWith("beat1");
    });

    it("returns null when not found", async () => {
      vi.mocked(Beat.findById).mockReturnValue(chainable(null) as never);

      const result = await beatRepository.findById("missing");
      expect(result).toBeNull();
    });

    it("applies session when provided", async () => {
      const chain = chainable(mockBeat);
      vi.mocked(Beat.findById).mockReturnValue(chain as never);
      const session = {} as never;

      await beatRepository.findById("beat1", false, { session });
      expect(chain.session).toHaveBeenCalledWith(session);
    });
  });

  describe("findByIds", () => {
    it("returns empty array for empty ids", async () => {
      const result = await beatRepository.findByIds([]);
      expect(result).toEqual([]);
      expect(Beat.find).not.toHaveBeenCalled();
    });

    it("returns beats sorted by input order", async () => {
      const beat1 = { ...mockBeat, _id: "b1" };
      const beat2 = { ...mockBeat, _id: "b2" };
      vi.mocked(Beat.find).mockReturnValue(chainable([beat2, beat1]) as never);

      const result = await beatRepository.findByIds(["b1", "b2"]);
      expect(result[0]._id).toBe("b1");
      expect(result[1]._id).toBe("b2");
    });
  });

  describe("create", () => {
    it("calls Beat.create with session and returns object", async () => {
      vi.mocked(Beat.create).mockResolvedValue([
        { toObject: () => mockBeat },
      ] as never);
      const session = {} as never;

      const result = await beatRepository.create(
        { title: "Test Beat" },
        { session }
      );
      expect(Beat.create).toHaveBeenCalledWith(
        [{ title: "Test Beat" }],
        { session }
      );
      expect(result).toEqual(mockBeat);
    });
  });

  describe("update", () => {
    it("calls findByIdAndUpdate and returns updated beat", async () => {
      vi.mocked(Beat.findByIdAndUpdate).mockReturnValue(
        chainable(mockBeat) as never
      );

      const result = await beatRepository.update("beat1", { title: "Updated" });
      expect(Beat.findByIdAndUpdate).toHaveBeenCalledWith(
        "beat1",
        { title: "Updated" },
        { new: true }
      );
      expect(result).toEqual(mockBeat);
    });
  });

  describe("delete", () => {
    it("returns true when beat is deleted", async () => {
      vi.mocked(Beat.findByIdAndDelete).mockResolvedValue(mockBeat as never);

      const result = await beatRepository.delete("beat1");
      expect(result).toBe(true);
      expect(Beat.findByIdAndDelete).toHaveBeenCalledWith("beat1", {
        session: undefined,
      });
    });

    it("returns false when beat not found", async () => {
      vi.mocked(Beat.findByIdAndDelete).mockResolvedValue(null as never);

      const result = await beatRepository.delete("missing");
      expect(result).toBe(false);
    });
  });

  describe("incrementPlays", () => {
    it("calls findByIdAndUpdate with $inc", async () => {
      vi.mocked(Beat.findByIdAndUpdate).mockResolvedValue(null as never);

      await beatRepository.incrementPlays("beat1");
      expect(Beat.findByIdAndUpdate).toHaveBeenCalledWith("beat1", {
        $inc: { plays: 1 },
      });
    });
  });

  describe("assignPackToBeats", () => {
    it("calls updateMany with correct filter and update", async () => {
      vi.mocked(Beat.updateMany).mockResolvedValue({} as never);

      await beatRepository.assignPackToBeats(["b1", "b2"], "pack1");
      expect(Beat.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["b1", "b2"] } },
        { $set: { packId: "pack1", saleMode: "pack_only" } },
        { session: undefined }
      );
    });
  });

  describe("clearPackFromBeats", () => {
    it("calls updateMany to unset packId", async () => {
      vi.mocked(Beat.updateMany).mockResolvedValue({} as never);

      await beatRepository.clearPackFromBeats(["b1", "b2"]);
      expect(Beat.updateMany).toHaveBeenCalledWith(
        { _id: { $in: ["b1", "b2"] } },
        { $set: { saleMode: "single" }, $unset: { packId: 1 } },
        { session: undefined }
      );
    });
  });

  describe("findRecent", () => {
    it("returns sorted beats with default limit", async () => {
      const beats = [mockBeat];
      vi.mocked(Beat.find).mockReturnValue(chainable(beats) as never);

      const result = await beatRepository.findRecent();
      expect(result).toEqual(beats);
      expect(Beat.find).toHaveBeenCalled();
    });
  });

  describe("findTrending", () => {
    it("returns beats sorted by plays", async () => {
      const beats = [mockBeat];
      vi.mocked(Beat.find).mockReturnValue(chainable(beats) as never);

      const result = await beatRepository.findTrending();
      expect(result).toEqual(beats);
    });
  });

  describe("countByProducer", () => {
    it("calls countDocuments with producerId", async () => {
      vi.mocked(Beat.countDocuments).mockResolvedValue(5 as never);

      const result = await beatRepository.countByProducer("prod1");
      expect(result).toBe(5);
      expect(Beat.countDocuments).toHaveBeenCalledWith({
        producerId: "prod1",
      });
    });
  });

  describe("countByProducerAndStatus", () => {
    it("calls countDocuments with producerId and status", async () => {
      vi.mocked(Beat.countDocuments).mockResolvedValue(3 as never);

      const result = await beatRepository.countByProducerAndStatus(
        "prod1",
        "published" as never
      );
      expect(result).toBe(3);
      expect(Beat.countDocuments).toHaveBeenCalledWith({
        producerId: "prod1",
        status: "published",
      });
    });
  });

  describe("findWithFilters", () => {
    it("constructs query with genre filter", async () => {
      const beats = [mockBeat];
      vi.mocked(Beat.find).mockReturnValue(chainable(beats) as never);
      vi.mocked(Beat.countDocuments).mockResolvedValue(1 as never);

      const result = await beatRepository.findWithFilters(
        { genre: "Hip Hop" },
        1,
        10
      );
      expect(result.data).toEqual(beats);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("returns empty when producer search yields no matches", async () => {
      vi.mocked(User.find).mockReturnValue(chainable([]) as never);

      const result = await beatRepository.findWithFilters(
        { producer: "nobody" },
        1,
        10
      );
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("findByProducerPaginated", () => {
    it("returns paginated results", async () => {
      const beats = [mockBeat];
      vi.mocked(Beat.find).mockReturnValue(chainable(beats) as never);
      vi.mocked(Beat.countDocuments).mockResolvedValue(1 as never);

      const result = await beatRepository.findByProducerPaginated("prod1");
      expect(result.data).toEqual(beats);
      expect(result.total).toBe(1);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrev).toBe(false);
    });
  });
});
