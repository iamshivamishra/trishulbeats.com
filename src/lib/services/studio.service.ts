import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatService } from "@/lib/services/beat.service";

export const studioService = {
  async getAnalytics(producerId: string) {
    const [
      totalEarnings,
      totalSales,
      stats,
      monthlyData,
      topBeats,
      producerBeats,
    ] = await Promise.all([
      purchaseRepository.getEarningsByProducer(producerId),
      purchaseRepository.countByProducer(producerId),
      beatService.getProducerStats(producerId),
      purchaseRepository.getMonthlyRevenue(producerId, 12),
      purchaseRepository.getTopBeats(producerId, 5),
      beatRepository.findByProducerId(producerId, true),
    ]);

    return {
      totalEarnings,
      totalSales,
      totalPlays: producerBeats.reduce((sum, beat) => sum + beat.plays, 0),
      beats: stats,
      monthlyData,
      topBeats,
    };
  },

  async getSales(producerId: string, page: number, limit: number) {
    return purchaseRepository.getProducerSales(producerId, page, Math.min(limit, 50));
  },
};
