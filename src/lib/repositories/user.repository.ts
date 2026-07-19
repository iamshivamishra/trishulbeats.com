import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import type { IUser } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const userRepository = {
  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    await connectDB();
    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select("+password");
    return query.lean<IUser>();
  },

  async findById(id: string, includePassword = false): Promise<IUser | null> {
    await connectDB();
    const query = User.findById(id);
    if (includePassword) query.select("+password");
    return query.lean<IUser>();
  },

  async findByIds(ids: string[]): Promise<IUser[]> {
    await connectDB();
    if (ids.length === 0) return [];
    return User.find({ _id: { $in: ids } }).lean<IUser[]>();
  },

  async findByUsername(username: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ username: username.toLowerCase() }).lean<IUser>();
  },

  /** @deprecated Use findByUsername instead */
  async findBySlug(slug: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({
      $or: [
        { username: slug.toLowerCase() },
        { producerSlug: slug.toLowerCase() },
      ],
    }).lean<IUser>();
  },

  async create(data: Partial<IUser>): Promise<IUser> {
    await connectDB();
    const user = await User.create(data);
    const { password: _, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword as unknown as IUser;
  },

  async update(id: string, data: Partial<IUser>): Promise<IUser | null> {
    await connectDB();
    return User.findByIdAndUpdate(id, data, { new: true }).lean<IUser>();
  },

  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    await connectDB();
    const query: Record<string, unknown> = { username: username.toLowerCase() };
    if (excludeUserId) query._id = { $ne: excludeUserId };
    return (await User.countDocuments(query)) > 0;
  },

  /** @deprecated Use usernameExists instead */
  async slugExists(slug: string, excludeUserId?: string): Promise<boolean> {
    await connectDB();
    const query: Record<string, unknown> = {
      $or: [
        { username: slug.toLowerCase() },
        { producerSlug: slug.toLowerCase() },
      ],
    };
    if (excludeUserId) query._id = { $ne: excludeUserId };
    return (await User.countDocuments(query)) > 0;
  },

  async findProducers(limit = 20): Promise<IUser[]> {
    await connectDB();
    return User.find({ role: "producer" })
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit)
      .lean<IUser[]>();
  },

  async incrementSalesCount(producerId: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(
      producerId,
      { $inc: { salesCount: 1 } },
      { session: options.session }
    );
  },

  async incrementFollowersCount(userId: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(
      userId,
      { $inc: { followersCount: 1 } },
      { session: options.session }
    );
  },

  async decrementFollowersCount(userId: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.updateOne(
      { _id: userId, followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } },
      { session: options.session }
    );
  },

  async setFollowersCount(userId: string, count: number, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(
      userId,
      { $set: { followersCount: Math.max(0, count) } },
      { session: options.session }
    );
  },

  async countByRole(role: string): Promise<number> {
    await connectDB();
    return User.countDocuments({ role });
  },

  async countAll(): Promise<number> {
    await connectDB();
    return User.countDocuments();
  },

  async findAllPaginated({ page, limit }: { page: number; limit: number }) {
    await connectDB();
    return User.find()
      .select("name email role verified salesCount createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  async updateRole(userId: string, role: "buyer" | "producer" | "admin") {
    await connectDB();
    return User.findByIdAndUpdate(userId, { role });
  },

  async toggleVerified(userId: string) {
    await connectDB();
    const user = await User.findById(userId).select("verified");
    if (!user) return null;
    return User.findByIdAndUpdate(userId, { verified: !user.verified });
  },
};
