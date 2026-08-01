import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Purchase from "@/lib/models/Purchase";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { IPurchase } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const purchaseRepository = {
  async findByBuyerId(buyerId: string, options: RepoOptions = {}): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ buyerId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async findByBeatId(beatId: string, options: RepoOptions = {}): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ beatId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async hasPurchased(buyerId: string, beatId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    return (await Purchase.countDocuments({ buyerId, beatId }).session(options.session ?? null)) > 0;
  },

  async hasPurchasedBatch(buyerId: string, beatIds: string[], options: RepoOptions = {}): Promise<Set<string>> {
    await connectDB();
    if (beatIds.length === 0) return new Set();
    const results = await Purchase.find({ buyerId, beatId: { $in: beatIds } })
      .distinct("beatId")
      .session(options.session ?? null);
    return new Set(results.map((id: unknown) => id?.toString() ?? ""));
  },

  async findByBuyerAndBeat(
    buyerId: string,
    beatId: string,
    options: RepoOptions = {}
  ): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ buyerId, beatId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async findByBuyerAndBeatIds(
    buyerId: string,
    beatIds: string[],
    options: RepoOptions = {}
  ): Promise<IPurchase[]> {
    await connectDB();
    if (beatIds.length === 0) return [];
    return Purchase.find({ buyerId, beatId: { $in: beatIds } })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async findByBuyerAndOrderId(
    buyerId: string,
    orderId: string,
    options: RepoOptions = {}
  ): Promise<IPurchase[]> {
    await connectDB();
    return Purchase.find({ buyerId, orderId })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IPurchase[]>();
  },

  async create(data: Partial<IPurchase>, options: RepoOptions = {}): Promise<IPurchase> {
    await connectDB();
    if (options.session) {
      const purchase = await Purchase.create([data], { session: options.session });
      return purchase[0].toObject() as IPurchase;
    }
    const purchase = await Purchase.create(data);
    return purchase.toObject() as IPurchase;
  },

  async upgradeTier(
    buyerId: string,
    beatId: string,
    upgradeData: {
      licenseId: string;
      licenseType: string;
      includesWav: boolean;
      includesStems: boolean;
      upgradedFrom: string;
      orderId: string;
      paymentId: string;
      upgradeAmount: number;
    },
    options: RepoOptions = {}
  ): Promise<IPurchase | null> {
    await connectDB();
    return Purchase.findOneAndUpdate(
      { buyerId, beatId },
      {
        licenseId: upgradeData.licenseId,
        licenseType: upgradeData.licenseType,
        includesWav: upgradeData.includesWav,
        includesStems: upgradeData.includesStems,
        upgradedFrom: upgradeData.upgradedFrom,
        upgradedAt: new Date(),
        $inc: { amount: upgradeData.upgradeAmount },
      },
      { new: true, session: options.session ?? null }
    ).lean<IPurchase>();
  },

  async getPurchasedBeatIds(buyerId: string): Promise<string[]> {
    await connectDB();
    const purchases = await Purchase.find({ buyerId })
      .select("beatId")
      .lean<Pick<IPurchase, "beatId">[]>();
    return purchases.map((p) => p.beatId.toString());
  },

  async getEarningsByProducer(producerId: string): Promise<number> {
    await connectDB();
    const producerObjectId = toValidObjectIdOrNull(producerId);
    if (!producerObjectId) {
      return 0;
    }
    const result = await Purchase.aggregate([
      {
        $lookup: {
          from: "beats",
          let: { beatId: "$beatId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$beatId"] }, producerId: producerObjectId } },
          ],
          as: "beat",
        },
      },
      { $unwind: "$beat" },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  },

  async countByBuyer(buyerId: string): Promise<number> {
    await connectDB();
    return Purchase.countDocuments({ buyerId });
  },

  async countByBeat(beatId: string): Promise<number> {
    await connectDB();
    return Purchase.countDocuments({ beatId });
  },

  async countByLicense(licenseId: string): Promise<number> {
    await connectDB();
    return Purchase.countDocuments({ licenseId });
  },

  /**
   * Monthly revenue for a producer over the last N months.
   */
  async getMonthlyRevenue(
    producerId: string,
    months = 12
  ): Promise<{ month: string; revenue: number; sales: number }[]> {
    await connectDB();
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const producerObjectId = new mongoose.Types.ObjectId(producerId);
    const result = await Purchase.aggregate([
      { $match: { createdAt: { $gte: since } } },
      {
        $lookup: {
          from: "beats",
          let: { beatId: "$beatId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$beatId"] }, producerId: producerObjectId } },
          ],
          as: "beat",
        },
      },
      { $unwind: "$beat" },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amount" },
          sales: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const all: { month: string; revenue: number; sales: number }[] = [];
    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1;
      const label = `${d.toLocaleString("default", { month: "short" })} ${y}`;
      const found = result.find(
        (r: { _id: { year: number; month: number } }) =>
          r._id.year === y && r._id.month === m
      );
      all.push({
        month: label,
        revenue: found?.revenue ?? 0,
        sales: found?.sales ?? 0,
      });
    }

    return all;
  },

  /**
   * Top selling beats for a producer.
   */
  async getTopBeats(
    producerId: string,
    limit = 5
  ): Promise<
    { beatId: string; title: string; revenue: number; sales: number }[]
  > {
    await connectDB();
    const producerObjectId = new mongoose.Types.ObjectId(producerId);
    const result = await Purchase.aggregate([
      {
        $lookup: {
          from: "beats",
          let: { beatId: "$beatId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$beatId"] }, producerId: producerObjectId } },
          ],
          as: "beat",
        },
      },
      { $unwind: "$beat" },
      {
        $group: {
          _id: "$beatId",
          title: { $first: "$beat.title" },
          revenue: { $sum: "$amount" },
          sales: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);

    return result.map(
      (r: { _id: unknown; title: string; revenue: number; sales: number }) => ({
        beatId: r._id?.toString() ?? "",
        title: r.title,
        revenue: r.revenue,
        sales: r.sales,
      })
    );
  },

  /**
   * Recent sales for a producer with beat details.
   */
  async getProducerSales(
    producerId: string,
    page = 1,
    limit = 20
  ): Promise<{
    data: {
      purchaseId: string;
      beatTitle: string;
      beatId: string;
      licenseType: string;
      amount: number;
      buyerName: string;
      createdAt: Date;
    }[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    await connectDB();

    const producerObjectId = new mongoose.Types.ObjectId(producerId);
    const pipeline: mongoose.PipelineStage[] = [
      {
        $lookup: {
          from: "beats",
          let: { beatId: "$beatId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$beatId"] }, producerId: producerObjectId } },
          ],
          as: "beat",
        },
      },
      { $unwind: "$beat" },
      { $sort: { createdAt: -1 as const } },
    ];

    const countResult = await Purchase.aggregate([
      ...pipeline,
      { $count: "total" },
    ]);
    const total = countResult[0]?.total ?? 0;

    const result = await Purchase.aggregate([
      ...pipeline,
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "buyerId",
          foreignField: "_id",
          as: "buyer",
        },
      },
      { $unwind: { path: "$buyer", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          purchaseId: "$_id",
          beatTitle: "$beat.title",
          beatId: "$beatId",
          licenseType: 1,
          amount: 1,
          buyerName: {
            $ifNull: ["$buyer.displayName", "$buyer.name"],
          },
          createdAt: 1,
        },
      },
    ]);

    return {
      data: result.map((r) => ({
        ...r,
        purchaseId: r.purchaseId?.toString() ?? r._id?.toString() ?? "",
        beatId: r.beatId?.toString() ?? "",
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  },

  /**
   * Total sales count for a producer.
   */
  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    const producerObjectId = new mongoose.Types.ObjectId(producerId);
    const result = await Purchase.aggregate([
      {
        $lookup: {
          from: "beats",
          let: { beatId: "$beatId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$_id", "$$beatId"] }, producerId: producerObjectId } },
          ],
          as: "beat",
        },
      },
      { $unwind: "$beat" },
      { $count: "total" },
    ]);
    return result[0]?.total ?? 0;
  },

  async countAll(): Promise<number> {
    await connectDB();
    return Purchase.countDocuments();
  },

  async getTotalRevenue(): Promise<number> {
    await connectDB();
    const result = await Purchase.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    return result[0]?.total ?? 0;
  },

  async findByBuyerIdPaginated(
    buyerId: string,
    page = 1,
    limit = 20
  ): Promise<{ data: IPurchase[]; total: number; page: number; totalPages: number }> {
    await connectDB();
    const total = await Purchase.countDocuments({ buyerId });
    const data = await Purchase.find({ buyerId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IPurchase[]>();
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  },

  async findAllPaginated({ page, limit }: { page: number; limit: number }) {
    await connectDB();
    return Purchase.find()
      .populate("buyerId", "name email")
      .populate("beatId", "title coverUrl")
      .select("buyerId beatId licenseType amount createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },
};
