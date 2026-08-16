import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn((cb: (session: unknown) => Promise<unknown>) =>
    cb({ mockSession: true })
  ),
}));

vi.mock("@/lib/repositories/beat-pack.repository", () => ({
  beatPackRepository: {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findById: vi.fn(),
    listPublished: vi.fn(),
    listByProducer: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByIds: vi.fn(),
    findByProducerId: vi.fn(),
    assignPackToBeats: vi.fn(),
    clearPackFromBeats: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => {
  class NotFoundError extends Error {
    constructor(msg: string) {
      super(`${msg} not found`);
      this.name = "NotFoundError";
    }
  }
  class ForbiddenError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ForbiddenError";
    }
  }
  class ValidationError extends Error {
    details: Record<string, string[]>;
    constructor(msg: string, details: Record<string, string[]>) {
      super(msg);
      this.name = "ValidationError";
      this.details = details;
    }
  }
  class ConflictError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = "ConflictError";
    }
  }
  return { NotFoundError, ForbiddenError, ValidationError, ConflictError };
});

import { beatPackService } from "./beat-pack.service";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";

const mockBeat = (overrides = {}) => ({
  _id: "beat1",
  producerId: { toString: () => "producer1" },
  title: "Beat 1",
  isPublished: true,
  status: "published",
  packId: null,
  genre: "hip-hop",
  bpm: 120,
  duration: 180,
  saleMode: "single",
  ...overrides,
});

const mockPack = (overrides = {}) => ({
  _id: "pack1",
  producerId: { toString: () => "producer1" },
  beatIds: [{ toString: () => "beat1" }],
  isPublished: true,
  status: "published",
  prices: { basic: 499, premium: 1499, unlimited: 9999 },
  ...overrides,
});

describe("beatPackService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("creates a beat pack in a transaction", async () => {
      // Arrange
      const input = {
        title: "My Pack",
        beatIds: ["beat1"],
        prices: { basic: 499, premium: 1499, unlimited: 9999 },
        tags: ["hip-hop"],
        status: "published" as const,
      };
      vi.mocked(beatRepository.findByIds).mockResolvedValue([mockBeat()]);
      vi.mocked(beatPackRepository.create).mockResolvedValue(mockPack());

      // Act
      const result = await beatPackService.create(input, "producer1", "producer");

      // Assert
      expect(beatRepository.findByIds).toHaveBeenCalledWith(["beat1"], true);
      expect(beatPackRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: "My Pack", status: "published", isPublished: true }),
        expect.objectContaining({ session: { mockSession: true } })
      );
      expect(beatRepository.assignPackToBeats).toHaveBeenCalled();
      expect(result._id).toBe("pack1");
    });

    it("throws ConflictError when publishing with unpublished beats", async () => {
      // Arrange
      const input = {
        title: "My Pack",
        beatIds: ["beat1"],
        prices: { basic: 499, premium: 1499, unlimited: 9999 },
        tags: [],
        status: "published" as const,
      };
      vi.mocked(beatRepository.findByIds).mockResolvedValue([
        mockBeat({ isPublished: false, status: "draft" }),
      ]);

      // Act & Assert
      await expect(
        beatPackService.create(input, "producer1", "producer")
      ).rejects.toThrow("All beats must be published");
    });
  });

  describe("update", () => {
    it("updates a beat pack with beat additions and removals", async () => {
      // Arrange
      const existing = mockPack({ beatIds: [{ toString: () => "beat1" }] });
      vi.mocked(beatPackRepository.findById).mockResolvedValue(existing as never);
      vi.mocked(beatRepository.findByIds).mockResolvedValue([
        mockBeat({ _id: "beat2" }),
      ]);
      vi.mocked(beatPackRepository.update).mockResolvedValue(
        mockPack({ beatIds: [{ toString: () => "beat2" }] }) as never
      );

      // Act
      const result = await beatPackService.update(
        "pack1",
        { beatIds: ["beat2"] },
        "producer1",
        "producer"
      );

      // Assert
      expect(beatRepository.clearPackFromBeats).toHaveBeenCalledWith(
        ["beat1"],
        expect.objectContaining({ session: { mockSession: true } })
      );
      expect(beatRepository.assignPackToBeats).toHaveBeenCalledWith(
        ["beat2"],
        "pack1",
        expect.objectContaining({ session: { mockSession: true } })
      );
      expect(result).toBeDefined();
    });
  });

  describe("delete", () => {
    it("deletes pack and clears beats from pack", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(mockPack() as never);

      // Act
      await beatPackService.delete("pack1", "producer1", "producer");

      // Assert
      expect(beatRepository.clearPackFromBeats).toHaveBeenCalledWith(
        ["beat1"],
        expect.objectContaining({ session: { mockSession: true } })
      );
      expect(beatPackRepository.delete).toHaveBeenCalledWith(
        "pack1",
        expect.objectContaining({ session: { mockSession: true } })
      );
    });
  });

  describe("getById", () => {
    it("throws NotFoundError when pack does not exist", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(null as never);

      // Act & Assert
      await expect(beatPackService.getById("nonexistent")).rejects.toThrow(
        "not found"
      );
    });
  });

  describe("getPackDetail", () => {
    it("throws NotFoundError for unpublished pack when includeUnpublished is false", async () => {
      // Arrange
      const unpublishedPack = mockPack({ isPublished: false, status: "draft" });
      vi.mocked(beatPackRepository.findById).mockResolvedValue(unpublishedPack as never);

      // Act & Assert
      await expect(beatPackService.getPackDetail("pack1")).rejects.toThrow(
        "not found"
      );
    });

    it("returns pack detail with producer info for published pack", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(mockPack() as never);
      vi.mocked(userRepository.findById).mockResolvedValue({
        _id: "producer1",
        displayName: "DJ Producer",
        name: "Producer Name",
        username: "djproducer",
        avatarUrl: "https://example.com/avatar.jpg",
      } as never);
      vi.mocked(beatRepository.findByIds).mockResolvedValue([mockBeat()]);

      // Act
      const result = await beatPackService.getPackDetail("pack1");

      // Assert
      expect(result.producerName).toBe("DJ Producer");
      expect(result.producerUsername).toBe("djproducer");
      expect(result.beats).toHaveLength(1);
    });
  });

  describe("assertProducer", () => {
    it("allows admin to bypass producer check", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(mockPack() as never);

      // Act & Assert (no error thrown)
      await expect(
        beatPackService.delete("pack1", "admin-user", "admin")
      ).resolves.not.toThrow();
    });

    it("throws ForbiddenError for wrong producer", async () => {
      // Arrange
      vi.mocked(beatPackRepository.findById).mockResolvedValue(mockPack() as never);

      // Act & Assert
      await expect(
        beatPackService.delete("pack1", "other-user", "producer")
      ).rejects.toThrow("You can only manage your own beat packs");
    });
  });
});
