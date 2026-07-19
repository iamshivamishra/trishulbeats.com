import type { ClientSession } from "mongoose";
import { connectDB } from "@/lib/db";
import { Follow } from "@/lib/models/follow.model";

interface RepoOptions {
  session?: ClientSession;
}

export const followRepository = {
  /**
   * Check if `userId` is currently following `producerId`.
   */
  async isFollowing(userId: string, producerId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const existing = await Follow.findOne({
      follower: userId,
      following: producerId,
    })
      .session(options.session ?? null)
      .lean();
    return !!existing;
  },

  /**
   * Create a follow relationship and bump the producer's followersCount.
   * Safe to call even if already following (won't double count).
   */
  async follow(userId: string, producerId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const relation = await Follow.updateOne(
      { follower: userId, following: producerId },
      { $setOnInsert: { follower: userId, following: producerId, createdAt: new Date() } },
      {
        upsert: true,
        session: options.session,
      }
    );
    const inserted = relation.upsertedCount > 0;
    return inserted;
  },

  /**
   * Remove a follow relationship and decrement the producer's followersCount.
   * Safe to call even if not currently following.
   */
  async unfollow(userId: string, producerId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const deleted = await Follow.findOneAndDelete({
      follower: userId,
      following: producerId,
    }).session(options.session ?? null);

    return !!deleted;
  },

  /**
   * Get total number of followers for a producer (useful if you don't
   * want to rely on the cached followersCount field).
   */
  async countFollowers(producerId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    return Follow.countDocuments({ following: producerId }).session(options.session ?? null);
  },
};