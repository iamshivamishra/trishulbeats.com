import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Beat from "@/lib/models/Beat";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatService } from "@/lib/services/beat.service";

async function getTotalPlaysByProducer(producerId: string): Promise<number> {
  await connectDB();
  const result = await Beat.aggregate([
    { $match: { producerId: new mongoose.Types.ObjectId(producerId) } },
    { $group: { _id: null, totalPlays: { $sum: "$plays" } } },
  ]);
  return result[0]?.totalPlays ?? 0;
}

export const studioService = {
  async getAnalytics(producerId: string) {
    const [
      totalEarnings,
      totalSales,
      stats,
      monthlyData,
      topBeats,
      totalPlays,
    ] = await Promise.all([
      purchaseRepository.getEarningsByProducer(producerId),
      purchaseRepository.countByProducer(producerId),
      beatService.getProducerStats(producerId),
      purchaseRepository.getMonthlyRevenue(producerId, 12),
      purchaseRepository.getTopBeats(producerId, 5),
      getTotalPlaysByProducer(producerId),
    ]);

    return {
      totalEarnings,
      totalSales,
      totalPlays,
      beats: stats,
      monthlyData,
      topBeats,
    };
  },

  async getSales(producerId: string, page: number, limit: number) {
    return purchaseRepository.getProducerSales(producerId, page, Math.min(limit, 50));
  },
};
