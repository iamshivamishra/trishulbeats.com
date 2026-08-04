import { connectDB } from "@/lib/db";
import BeatPack from "@/lib/models/BeatPack";
import type { IBeatPack, BeatPackStatus, PaginatedResult } from "@/types";
import type { ClientSession, FilterQuery } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const beatPackRepository = {
  async create(data: Partial<IBeatPack>, options: RepoOptions = {}): Promise<IBeatPack> {
    await connectDB();
    const created = await BeatPack.create([data], { session: options.session });
    return created[0].toObject() as IBeatPack;
  },

  async update(id: string, data: Partial<IBeatPack>, options: RepoOptions = {}): Promise<IBeatPack | null> {
    await connectDB();
    return BeatPack.findByIdAndUpdate(id, data, { new: true, session: options.session }).lean<IBeatPack>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<IBeatPack | null> {
    await connectDB();
    return BeatPack.findById(id).session(options.session ?? null).lean<IBeatPack>();
  },

  async delete(id: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const result = await BeatPack.findByIdAndDelete(id, { session: options.session });
    return !!result;
  },

  async listPublished(page: number, limit: number, search?: string): Promise<PaginatedResult<IBeatPack>> {
    await connectDB();
    const query: FilterQuery<IBeatPack> = { isPublished: true, status: "published" };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      BeatPack.find(query).select("-metadata").sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IBeatPack[]>(),
      BeatPack.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  async listByProducer(
    producerId: string,
    page = 1,
    limit = 20,
    status?: BeatPackStatus
  ): Promise<PaginatedResult<IBeatPack>> {
    await connectDB();
    const query: FilterQuery<IBeatPack> = { producerId };
    if (status) query.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      BeatPack.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean<IBeatPack[]>(),
      BeatPack.countDocuments(query),
    ]);
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  async incrementSalesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await BeatPack.findByIdAndUpdate(id, { $inc: { salesCount: 1 } }, { session: options.session });
  },

  async findByIds(ids: string[]): Promise<IBeatPack[]> {
    await connectDB();
    if (ids.length === 0) return [];
    return BeatPack.find({ _id: { $in: ids } }).lean<IBeatPack[]>();
  },
};

