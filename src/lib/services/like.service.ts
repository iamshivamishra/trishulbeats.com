import { withTransaction } from "@/lib/db";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { likeRepository } from "@/lib/repositories/like.repository";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { UserRole } from "@/types";

interface ToggleLikeInput {
  userId?: string;
  role?: UserRole;
}

async function getPublishedBeatOrThrow(beatId: string) {
  const beatObjectId = toValidObjectIdOrNull(beatId);
  if (!beatObjectId) {
    throw new NotFoundError("Beat");
  }

  const beat = await beatRepository.findById(beatObjectId.toString(), false);
  if (!beat || !beat.isPublished || beat.status !== "published") {
    throw new NotFoundError("Beat");
  }

  return beat;
}

export const likeService = {
  async getLikeState(beatId: string, userId?: string): Promise<{ liked: boolean; likesCount: number }> {
    const beat = await getPublishedBeatOrThrow(beatId);
    const likesCount = await likeRepository.countByBeat(beatId);
    if ((beat.likesCount ?? 0) !== likesCount) {
      await beatRepository.setLikesCount(beatId, likesCount);
    }

    if (!userId) {
      return { liked: false, likesCount };
    }

    const liked = await likeRepository.isLiked(userId, beatId);
    return { liked, likesCount };
  },

  async toggleLike(input: ToggleLikeInput, beatId: string): Promise<{ liked: boolean; likesCount: number }> {
    if (!input.userId) {
      throw new UnauthorizedError();
    }
    const userId = input.userId;

    if (input.role !== "buyer") {
      throw new ForbiddenError("Only buyers can like beats");
    }

    await getPublishedBeatOrThrow(beatId);

    return withTransaction(async (session) => {
      const { liked } = await likeRepository.toggleLike(userId, beatId, { session });

      if (liked) {
        await beatRepository.incrementLikesCount(beatId, { session });
      } else {
        await beatRepository.decrementLikesCount(beatId, { session });
      }

      const likesCount = await likeRepository.countByBeat(beatId, { session });
      await beatRepository.setLikesCount(beatId, likesCount, { session });

      return {
        liked,
        likesCount,
      };
    });
  },
};
