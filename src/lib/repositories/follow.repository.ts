import { Follow } from "@/lib/models/follow.model";
import User from "@/lib/models/User";

export const followRepository = {
  /**
   * Check if `userId` is currently following `producerId`.
   */
  async isFollowing(userId: string, producerId: string): Promise<boolean> {
    const existing = await Follow.findOne({
      follower: userId,
      following: producerId,
    }).lean();
    return !!existing;
  },

  /**
   * Create a follow relationship and bump the producer's followersCount.
   * Safe to call even if already following (won't double count).
   */
  async follow(userId: string, producerId: string): Promise<void> {
    try {
      await Follow.create({ follower: userId, following: producerId });
      await User.findByIdAndUpdate(producerId, { $inc: { followersCount: 1 } });
    } catch (err: unknown) {
      // Duplicate key error (11000) = already following -> ignore silently
      const mongoErr = err as { code?: number };
      if (mongoErr?.code !== 11000) {
        throw err;
      }
    }
  },

  /**
   * Remove a follow relationship and decrement the producer's followersCount.
   * Safe to call even if not currently following.
   */
  async unfollow(userId: string, producerId: string): Promise<void> {
    const deleted = await Follow.findOneAndDelete({
      follower: userId,
      following: producerId,
    });

    if (deleted) {
      await User.findByIdAndUpdate(producerId, { $inc: { followersCount: -1 } });
    }
  },

  /**
   * Get total number of followers for a producer (useful if you don't
   * want to rely on the cached followersCount field).
   */
  async countFollowers(producerId: string): Promise<number> {
    return Follow.countDocuments({ following: producerId });
  },
};