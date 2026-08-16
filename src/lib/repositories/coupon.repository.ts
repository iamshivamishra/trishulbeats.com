import { connectDB } from "@/lib/db";
import Coupon from "@/lib/models/Coupon";
import type { ICoupon } from "@/types";
import type { ClientSession, FilterQuery } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const couponRepository = {
  async create(data: Partial<ICoupon>, options: RepoOptions = {}): Promise<ICoupon> {
    await connectDB();
    const [coupon] = await Coupon.create([data], { session: options.session });
    return coupon.toObject() as ICoupon;
  },

  async findById(id: string, options: RepoOptions = {}): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findById(id).session(options.session ?? null).lean<ICoupon>();
  },

  async findByCode(code: string, options: RepoOptions = {}): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findOne({ code: code.toUpperCase() })
      .session(options.session ?? null)
      .lean<ICoupon>();
  },

  async findByProducer(
    producerId: string,
    filter: { isActive?: boolean } = {},
    options: RepoOptions = {}
  ): Promise<ICoupon[]> {
    await connectDB();
    const query: FilterQuery<ICoupon> = { producerId };
    if (filter.isActive !== undefined) query.isActive = filter.isActive;
    return Coupon.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .session(options.session ?? null)
      .lean<ICoupon[]>();
  },

  async update(
    id: string,
    data: Partial<ICoupon>,
    options: RepoOptions = {}
  ): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findByIdAndUpdate(id, data, {
      new: true,
      session: options.session,
    }).lean<ICoupon>();
  },

  async incrementUsage(id: string, options: RepoOptions = {}): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findByIdAndUpdate(
      id,
      { $inc: { currentUses: 1 } },
      { new: true, session: options.session }
    ).lean<ICoupon>();
  },

  /**
   * Atomically increment currentUses only if the coupon is still eligible.
   * Returns true if the increment succeeded, false if the coupon was
   * already exhausted or inactive.
   */
  async incrementUsageIfAllowed(
    id: string,
    maxUses: number,
    options: RepoOptions = {}
  ): Promise<boolean> {
    await connectDB();
    const filter: FilterQuery<ICoupon> = {
      _id: id,
      isActive: true,
      isDraft: false,
      ...(maxUses > 0 && { currentUses: { $lt: maxUses } }),
    };
    const result = await Coupon.findOneAndUpdate(
      filter,
      { $inc: { currentUses: 1 } },
      { new: true, session: options.session }
    ).lean<ICoupon>();
    return result !== null;
  },

  async deactivate(id: string, options: RepoOptions = {}): Promise<ICoupon | null> {
    await connectDB();
    return Coupon.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true, session: options.session }
    ).lean<ICoupon>();
  },

  async codeExists(
    code: string,
    excludeId?: string,
    options: RepoOptions = {}
  ): Promise<boolean> {
    await connectDB();
    const query: FilterQuery<ICoupon> = { code: code.toUpperCase() };
    if (excludeId) query._id = { $ne: excludeId };
    const count = await Coupon.countDocuments(query).session(options.session ?? null);
    return count > 0;
  },

  async countByProducer(producerId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    return Coupon.countDocuments({ producerId }).session(options.session ?? null);
  },
};
