import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("mongoose", () => {
  class FakeObjectId {
    value: string;
    constructor(id: string) { this.value = id; }
    toString() { return this.value; }
  }
  return { default: { Types: { ObjectId: FakeObjectId } } };
});

vi.mock("@/lib/db", () => ({
  connectDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/models/Beat", () => ({
  default: {
    aggregate: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    getEarningsByProducer: vi.fn(),
    countByProducer: vi.fn(),
    getMonthlyRevenue: vi.fn(),
    getTopBeats: vi.fn(),
    getProducerSales: vi.fn(),
  },
}));

vi.mock("@/lib/services/beat.service", () => ({
  beatService: {
    getProducerStats: vi.fn(),
  },
}));

import { studioService } from "./studio.service";
import Beat from "@/lib/models/Beat";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatService } from "@/lib/services/beat.service";

describe("studioService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAnalytics", () => {
    it("aggregates all analytics data for a producer", async () => {
      // Arrange
      const producerId = "producer1";
      vi.mocked(purchaseRepository.getEarningsByProducer).mockResolvedValue(15000);
      vi.mocked(purchaseRepository.countByProducer).mockResolvedValue(42);
      vi.mocked(beatService.getProducerStats).mockResolvedValue({
        total: 10,
        published: 8,
        drafts: 2,
      } as never);
      vi.mocked(purchaseRepository.getMonthlyRevenue).mockResolvedValue([
        { month: "2024-01", revenue: 3000 },
        { month: "2024-02", revenue: 5000 },
      ] as never);
      vi.mocked(purchaseRepository.getTopBeats).mockResolvedValue([
        { beatId: "beat1", title: "Top Beat", sales: 20 },
      ] as never);
      vi.mocked(Beat.aggregate).mockResolvedValue([{ totalPlays: 5000 }]);

      // Act
      const result = await studioService.getAnalytics(producerId);

      // Assert
      expect(result.totalEarnings).toBe(15000);
      expect(result.totalSales).toBe(42);
      expect(result.totalPlays).toBe(5000);
      expect(result.beats).toEqual({ total: 10, published: 8, drafts: 2 });
      expect(result.monthlyData).toHaveLength(2);
      expect(result.topBeats).toHaveLength(1);
      expect(purchaseRepository.getMonthlyRevenue).toHaveBeenCalledWith(producerId, 12);
      expect(purchaseRepository.getTopBeats).toHaveBeenCalledWith(producerId, 5);
    });

    it("returns 0 plays when no beats exist", async () => {
      // Arrange
      vi.mocked(purchaseRepository.getEarningsByProducer).mockResolvedValue(0);
      vi.mocked(purchaseRepository.countByProducer).mockResolvedValue(0);
      vi.mocked(beatService.getProducerStats).mockResolvedValue({
        total: 0,
        published: 0,
        drafts: 0,
      } as never);
      vi.mocked(purchaseRepository.getMonthlyRevenue).mockResolvedValue([]);
      vi.mocked(purchaseRepository.getTopBeats).mockResolvedValue([]);
      vi.mocked(Beat.aggregate).mockResolvedValue([]);

      // Act
      const result = await studioService.getAnalytics("producer-empty");

      // Assert
      expect(result.totalPlays).toBe(0);
      expect(result.totalEarnings).toBe(0);
    });
  });

  describe("getSales", () => {
    it("returns sales for a producer", async () => {
      // Arrange
      const sales = [
        { _id: "sale1", beatTitle: "Beat 1", amount: 499 },
        { _id: "sale2", beatTitle: "Beat 2", amount: 1499 },
      ];
      vi.mocked(purchaseRepository.getProducerSales).mockResolvedValue(sales as never);

      // Act
      const result = await studioService.getSales("producer1", 1, 10);

      // Assert
      expect(purchaseRepository.getProducerSales).toHaveBeenCalledWith("producer1", 1, 10);
      expect(result).toHaveLength(2);
    });

    it("caps limit at 50", async () => {
      // Arrange
      vi.mocked(purchaseRepository.getProducerSales).mockResolvedValue([]);

      // Act
      await studioService.getSales("producer1", 1, 100);

      // Assert
      expect(purchaseRepository.getProducerSales).toHaveBeenCalledWith("producer1", 1, 50);
    });
  });
});
