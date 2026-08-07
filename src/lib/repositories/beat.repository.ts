import { connectDB } from "@/lib/db";
import Beat from "@/lib/models/Beat";
import User from "@/lib/models/User";
import type { IBeat, BeatStatus, BeatFilters, PaginatedResult } from "@/types";
import type { ClientSession, FilterQuery, SortOrder } from "mongoose";

type SortOption = "newest" | "popular" | "most_sold" | "price_asc" | "price_desc";

const SORT_MAP: Record<SortOption, Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  popular: { plays: -1 },
  most_sold: { salesCount: -1, createdAt: -1 },
  price_asc: { "licenses.price": 1 },
  price_desc: { "licenses.price": -1 },
};

const PUBLIC_BEAT_EXCLUSIONS = "-audioFullUrl -stemsUrl -storageKeys";
const PUBLIC_SALE_MODE_FILTER: FilterQuery<IBeat> = {
  $or: [{ saleMode: { $exists: false } }, { saleMode: "single" }],
};

interface RepoOptions {
  session?: ClientSession;
}

export const beatRepository = {
  async findWithFilters(
    filters: BeatFilters,
    page: number,
    limit: number,
    sort: SortOption = "newest"
  ): Promise<PaginatedResult<IBeat>> {
    await connectDB();
    const query: FilterQuery<IBeat> = {};

    if (filters.isPublished !== undefined) query.isPublished = filters.isPublished;
    else query.isPublished = true;
    if (query.isPublished) {
      Object.assign(query, PUBLIC_SALE_MODE_FILTER);
    }

    if (filters.genre) query.genre = filters.genre;
    if (filters.key) query.key = filters.key;
    if (filters.mood) query.mood = filters.mood;
    if (filters.producerId) query.producerId = filters.producerId;
    if (filters.tags?.length) query.tags = { $in: filters.tags };

    if (filters.bpm) {
      query.bpm = {};
      if (filters.bpm.min) query.bpm.$gte = filters.bpm.min;
      if (filters.bpm.max) query.bpm.$lte = filters.bpm.max;
    }

    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    if (filters.producer) {
      const producers = await User.find(
        {
          role: "producer",
          $or: [
            { name: { $regex: filters.producer, $options: "i" } },
            { displayName: { $regex: filters.producer, $options: "i" } },
            { username: { $regex: filters.producer, $options: "i" } },
          ],
        },
        { _id: 1 }
      ).lean();
      const ids = producers.map((p) => p._id);
      if (ids.length > 0) {
        query.producerId = { $in: ids };
      } else {
        return { data: [], total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false };
      }
    }

    const skip = (page - 1) * limit;
    const sortOrder = SORT_MAP[sort] || SORT_MAP.newest;

    const [data, total] = await Promise.all([
      Beat.find(query)
        .select(PUBLIC_BEAT_EXCLUSIONS)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .lean<IBeat[]>(),
      Beat.countDocuments(query),
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

  async findById(
    id: string,
    includeFullAudio = false,
    options: RepoOptions = {}
  ): Promise<IBeat | null> {
    await connectDB();
    const query = Beat.findById(id);
    if (!includeFullAudio) query.select(PUBLIC_BEAT_EXCLUSIONS);
    if (options.session) query.session(options.session);
    return query.lean<IBeat>();
  },

  async findByProducerId(producerId: string, includeUnpublished = false): Promise<IBeat[]> {
    await connectDB();
    const query: FilterQuery<IBeat> = { producerId };
    if (!includeUnpublished) {
      query.isPublished = true;
      Object.assign(query, PUBLIC_SALE_MODE_FILTER);
    }
    const dbQuery = Beat.find(query).sort({ createdAt: -1 });
    if (!includeUnpublished) {
      dbQuery.select(PUBLIC_BEAT_EXCLUSIONS);
    }
    return dbQuery.lean<IBeat[]>();
  },

  async findByIds(ids: string[], includeFullAudio = false): Promise<IBeat[]> {
    await connectDB();
    if (ids.length === 0) return [];
    const query = Beat.find({ _id: { $in: ids } });
    if (!includeFullAudio) {
      query.select(PUBLIC_BEAT_EXCLUSIONS);
    }
    const beats = await query.lean<IBeat[]>();
    // $in doesn't guarantee order — re-sort to match the input array
    const idOrder = new Map(ids.map((id, i) => [id, i]));
    return beats.sort(
      (a, b) => (idOrder.get(a._id.toString()) ?? 0) - (idOrder.get(b._id.toString()) ?? 0)
    );
  },

  async findByIdsMinimal(ids: string[]): Promise<Pick<IBeat, "_id" | "title" | "genre" | "bpm" | "duration" | "audioTaggedUrl">[]> {
    await connectDB();
    if (ids.length === 0) return [];
    return Beat.find({ _id: { $in: ids } })
      .select("title genre bpm duration audioTaggedUrl")
      .lean();
  },

  async findByProducerPaginated(
    producerId: string,
    status?: BeatStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IBeat>> {
    await connectDB();
    const query: FilterQuery<IBeat> = { producerId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      Beat.find(query)
        .select(PUBLIC_BEAT_EXCLUSIONS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean<IBeat[]>(),
      Beat.countDocuments(query),
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

  async create(data: Partial<IBeat>, options: RepoOptions = {}): Promise<IBeat> {
    await connectDB();
    const beat = await Beat.create([data], { session: options.session });
    return beat[0].toObject() as IBeat;
  },

  async update(id: string, data: Partial<IBeat>): Promise<IBeat | null> {
    await connectDB();
    return Beat.findByIdAndUpdate(id, data, { new: true }).lean<IBeat>();
  },

  async delete(id: string, options: RepoOptions = {}): Promise<boolean> {
    await connectDB();
    const result = await Beat.findByIdAndDelete(id, { session: options.session });
    return !!result;
  },

  async incrementPlays(id: string): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { plays: 1 } });
  },

  async incrementSalesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { salesCount: 1 } }, { session: options.session });
  },

  async incrementLikesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(id, { $inc: { likesCount: 1 } }, { session: options.session });
  },

  async decrementLikesCount(id: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.updateOne(
      { _id: id, likesCount: { $gt: 0 } },
      { $inc: { likesCount: -1 } },
      { session: options.session }
    );
  },

  async setLikesCount(id: string, likesCount: number, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.findByIdAndUpdate(
      id,
      { $set: { likesCount: Math.max(0, likesCount) } },
      { session: options.session }
    );
  },

  async findRecent(limit = 8): Promise<IBeat[]> {
    await connectDB();
    return Beat.find({ isPublished: true, ...PUBLIC_SALE_MODE_FILTER })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<IBeat[]>();
  },

  async findTrending(limit = 8): Promise<IBeat[]> {
    await connectDB();
    return Beat.find({ isPublished: true, ...PUBLIC_SALE_MODE_FILTER })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ plays: -1 })
      .limit(limit)
      .lean<IBeat[]>();
  },

  async countByProducer(producerId: string): Promise<number> {
    await connectDB();
    return Beat.countDocuments({ producerId });
  },

  async countByProducerAndStatus(producerId: string, status: BeatStatus): Promise<number> {
    await connectDB();
    return Beat.countDocuments({ producerId, status });
  },

  async findRelated(
    beatId: string,
    genre: string,
    producerId: string,
    limit = 6
  ): Promise<IBeat[]> {
    await connectDB();
    const byGenre = await Beat.find({
      _id: { $ne: beatId },
      isPublished: true,
      ...PUBLIC_SALE_MODE_FILTER,
      $or: [{ genre }, { producerId }],
    })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ plays: -1 })
      .limit(limit)
      .lean<IBeat[]>();

    if (byGenre.length >= limit) return byGenre;

    const existingIds = [beatId, ...byGenre.map((b) => b._id.toString())];
    const filler = await Beat.find({
      _id: { $nin: existingIds },
      isPublished: true,
      ...PUBLIC_SALE_MODE_FILTER,
    })
      .select(PUBLIC_BEAT_EXCLUSIONS)
      .sort({ plays: -1 })
      .limit(limit - byGenre.length)
      .lean<IBeat[]>();

    return [...byGenre, ...filler];
  },

  async countAll(): Promise<number> {
    await connectDB();
    return Beat.countDocuments();
  },

  // --- Niche wale extra functions jo merge kiye gaye hain ---

  async findAllPaginated({ page, limit }: { page: number; limit: number }) {
    await connectDB(); // Connection ensure karne ke liye yahan bhi add kar diya hai
    return Beat.find()
      .populate("producerId", "name username")
      .select("title genre coverUrl plays status isPublished producerId createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  async deleteById(beatId: string) {
    await connectDB();
    return Beat.findByIdAndDelete(beatId);
  },

  async assignPackToBeats(beatIds: string[], packId: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.updateMany(
      { _id: { $in: beatIds } },
      { $set: { packId, saleMode: "pack_only" } },
      { session: options.session }
    );
  },

  async clearPackFromBeats(beatIds: string[], options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await Beat.updateMany(
      { _id: { $in: beatIds } },
      { $set: { saleMode: "single" }, $unset: { packId: 1 } },
      { session: options.session }
    );
  },

  async findByPackId(packId: string, includeFullAudio = false): Promise<IBeat[]> {
    await connectDB();
    const query = Beat.find({ packId });
    if (!includeFullAudio) query.select(PUBLIC_BEAT_EXCLUSIONS);
    return query.lean<IBeat[]>();
  }
};