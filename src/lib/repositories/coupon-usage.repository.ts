import { connectDB } from "@/lib/db";
import CouponUsage from "@/lib/models/CouponUsage";
import type { ICouponUsage } from "@/types";
import { Types, type ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const couponUsageRepository = {
  async create(
    data: Partial<ICouponUsage>,
    options: RepoOptions = {}
  ): Promise<ICouponUsage> {
    await connectDB();
    const [usage] = await CouponUsage.create([data], { session: options.session });
    return usage.toObject() as ICouponUsage;
  },

  async countByUserAndCoupon(
    userId: string,
    couponId: string,
    options: RepoOptions = {}
  ): Promise<number> {
    await connectDB();
    return CouponUsage.countDocuments({ userId, couponId }).session(
      options.session ?? null
    );
  },

  async findByCoupon(
    couponId: string,
    options: RepoOptions = {}
  ): Promise<ICouponUsage[]> {
    await connectDB();
    return CouponUsage.find({ couponId })
      .sort({ usedAt: -1 })
      .session(options.session ?? null)
      .lean<ICouponUsage[]>();
  },

  async findByOrder(
    orderId: string,
    options: RepoOptions = {}
  ): Promise<ICouponUsage[]> {
    await connectDB();
    return CouponUsage.find({ orderId })
      .session(options.session ?? null)
      .lean<ICouponUsage[]>();
  },

  async totalDiscountByCoupon(
    couponId: string,
    options: RepoOptions = {}
  ): Promise<number> {
    await connectDB();
    const result = await CouponUsage.aggregate([
      { $match: { couponId: new Types.ObjectId(couponId) } },
      { $group: { _id: null, total: { $sum: "$discount" } } },
    ]).session(options.session ?? null);
    return result[0]?.total ?? 0;
  },
};
