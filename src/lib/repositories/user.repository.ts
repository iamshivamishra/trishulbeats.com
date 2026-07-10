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

  async countByRole(role: string): Promise<number> {
    await connectDB();
    return User.countDocuments({ role });
  },
  countAll: () => User.countDocuments(),

findAllPaginated: async ({ page, limit }: { page: number; limit: number }) => {
  return User.find()
    .select("name email role verified salesCount createdAt")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
},

updateRole: (userId: string, role: "buyer" | "producer" | "admin") =>
  User.findByIdAndUpdate(userId, { role }),

toggleVerified: async (userId: string) => {
  const user = await User.findById(userId).select("verified");
  if (!user) return null;
  return User.findByIdAndUpdate(userId, { verified: !user.verified });
},
};
