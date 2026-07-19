import { withTransaction } from "@/lib/db";
import { ConflictError } from "@/lib/errors";
import { followRepository } from "@/lib/repositories/follow.repository";
import { userRepository } from "@/lib/repositories/user.repository";

export const followService = {
  async follow(userId: string, producerId: string): Promise<{ following: boolean }> {
    if (userId === producerId) {
      throw new ConflictError("You cannot follow yourself");
    }

    const inserted = await withTransaction(async (session) => {
      const created = await followRepository.follow(userId, producerId, { session });
      if (created) {
        await userRepository.incrementFollowersCount(producerId, { session });
      }
      return created;
    });

    return { following: inserted || (await followRepository.isFollowing(userId, producerId)) };
  },

  async unfollow(userId: string, producerId: string): Promise<{ following: boolean }> {
    await withTransaction(async (session) => {
      const removed = await followRepository.unfollow(userId, producerId, { session });
      if (removed) {
        await userRepository.decrementFollowersCount(producerId, { session });
      }
    });

    return { following: false };
  },
};
