import { connectDB } from "@/lib/db";
import { Like } from "@/lib/models/like.model";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const likeRepository = {
  async isLiked(userId: string, beatId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const existing = await Like.findOne({ userId, beatId }, null, { session: options.session }).lean();
    return !!existing;
  },

  async createLike(userId: string, beatId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    try {
      await Like.create([{ userId, beatId }], { session: options.session });
      return true;
    } catch (err: unknown) {
      const mongoErr = err as { code?: number };
      if (mongoErr?.code === 11000) {
        return false;
      }
      throw err;
    }
  },

  async deleteLike(userId: string, beatId: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const deleted = await Like.findOneAndDelete({ userId, beatId }, { session: options.session });
    return !!deleted;
  },

  async toggleLike(
    userId: string,
    beatId: string,
    options: RepoOptions = {}
  ): Promise<{ liked: boolean }> {
    await connectDB();
    const wasDeleted = await this.deleteLike(userId, beatId, options);
    if (wasDeleted) {
      return { liked: false };
    }

    const created = await this.createLike(userId, beatId, options);
    if (created) {
      return { liked: true };
    }

    return { liked: true };
  },

  async countByBeat(beatId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    return Like.countDocuments({ beatId }, { session: options.session });
  },
};
