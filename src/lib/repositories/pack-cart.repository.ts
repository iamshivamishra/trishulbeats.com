import { connectDB } from "@/lib/db";
import PackCartItem from "@/lib/models/PackCart";
import type { IBeatPackCartItem } from "@/types";

export const packCartRepository = {
  async findByUser(userId: string): Promise<IBeatPackCartItem[]> {
    await connectDB();
    return PackCartItem.find({ userId }).sort({ addedAt: -1 }).lean<IBeatPackCartItem[]>();
  },

  async findOne(userId: string, packId: string): Promise<IBeatPackCartItem | null> {
    await connectDB();
    return PackCartItem.findOne({ userId, packId }).lean<IBeatPackCartItem>();
  },

  async add(userId: string, packId: string, tier: "basic" | "premium" | "unlimited"): Promise<IBeatPackCartItem> {
    await connectDB();
    const item = await PackCartItem.findOneAndUpdate(
      { userId, packId },
      { userId, packId, tier, addedAt: new Date() },
      { upsert: true, new: true }
    ).lean<IBeatPackCartItem>();
    return item!;
  },

  async updateTier(
    userId: string,
    packId: string,
    tier: "basic" | "premium" | "unlimited"
  ): Promise<IBeatPackCartItem | null> {
    await connectDB();
    return PackCartItem.findOneAndUpdate({ userId, packId }, { tier }, { new: true }).lean<IBeatPackCartItem>();
  },

  async remove(userId: string, packId: string): Promise<boolean> {
    await connectDB();
    const result = await PackCartItem.deleteOne({ userId, packId });
    return result.deletedCount > 0;
  },

  async clear(userId: string): Promise<number> {
    await connectDB();
    const result = await PackCartItem.deleteMany({ userId });
    return result.deletedCount;
  },
};

