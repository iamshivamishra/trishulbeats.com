import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/services/beat.service", () => ({
  beatService: {
    list: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findCheapestForBeats: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/serializers/beat", () => ({
  toPublicBeatPayload: vi.fn((beat: Record<string, unknown>) => beat),
}));

import { marketplaceService } from "./marketplace.service";
import { beatService } from "@/lib/services/beat.service";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";

const mockBeat = (id: string, producerId: string) => ({
  _id: { toString: () => id },
  producerId: { toString: () => producerId },
  title: `Beat ${id}`,
  genre: "hip-hop",
});

const mockListResult = (beats: ReturnType<typeof mockBeat>[]) => ({
  data: beats,
  total: beats.length,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasNext: false,
});

describe("marketplaceService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("returns enriched beats with prices and producer info", async () => {
      // Arrange
      const beats = [mockBeat("beat1", "producer1"), mockBeat("beat2", "producer1")];
      vi.mocked(beatService.list).mockResolvedValue(mockListResult(beats) as never);
      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue({
        beat1: { price: 299 },
        beat2: { price: 499 },
      } as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue([
        {
          _id: { toString: () => "producer1" },
          displayName: "DJ Producer",
          name: "Producer",
          username: "djproducer",
        },
      ] as never);

      // Act
      const result = await marketplaceService.list({ page: 1, limit: 20 });

      // Assert
      expect(result.beats).toHaveLength(2);
      expect(result.beats[0].startingPrice).toBe(299);
      expect(result.beats[0].producerName).toBe("DJ Producer");
      expect(result.beats[0].producerUsername).toBe("djproducer");
      expect(result.total).toBe(2);
    });

    it("returns empty result when no beats match", async () => {
      // Arrange
      vi.mocked(beatService.list).mockResolvedValue(mockListResult([]) as never);
      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue({});
      vi.mocked(userRepository.findByIds).mockResolvedValue([]);

      // Act
      const result = await marketplaceService.list({ page: 1, limit: 20 });

      // Assert
      expect(result.beats).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("returns null startingPrice when no license exists", async () => {
      // Arrange
      const beats = [mockBeat("beat1", "producer1")];
      vi.mocked(beatService.list).mockResolvedValue(mockListResult(beats) as never);
      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue({} as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue([
        {
          _id: { toString: () => "producer1" },
          displayName: "Solo Artist",
          name: "Solo",
          username: "solo",
        },
      ] as never);

      // Act
      const result = await marketplaceService.list({ page: 1, limit: 20 });

      // Assert
      expect(result.beats[0].startingPrice).toBeNull();
    });

    it("maps producer info correctly for multiple producers", async () => {
      // Arrange
      const beats = [mockBeat("beat1", "p1"), mockBeat("beat2", "p2")];
      vi.mocked(beatService.list).mockResolvedValue(mockListResult(beats) as never);
      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue({});
      vi.mocked(userRepository.findByIds).mockResolvedValue([
        {
          _id: { toString: () => "p1" },
          displayName: "Producer One",
          name: "P1",
          username: "p1",
        },
        {
          _id: { toString: () => "p2" },
          displayName: null,
          name: "Producer Two",
          username: "p2",
        },
      ] as never);

      // Act
      const result = await marketplaceService.list({ page: 1, limit: 20 });

      // Assert
      expect(result.beats[0].producerName).toBe("Producer One");
      expect(result.beats[1].producerName).toBe("Producer Two");
    });
  });
});
