import { withTransaction } from "@/lib/db";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { BeatPackFilterInput, CreateBeatPackInput, UpdateBeatPackInput } from "@/lib/validators/beat-pack";
import type { IBeatPack } from "@/types";

function normalizeStatus(status: "draft" | "published" | "archived" | undefined) {
  if (!status) return { status: "draft" as const, isPublished: false };
  if (status === "published") return { status, isPublished: true };
  return { status, isPublished: false };
}

async function assertProducer(userId: string, userRole: string, producerId: string) {
  if (userRole === "admin") return;
  if (producerId !== userId) {
    throw new ForbiddenError("You can only manage your own beat packs");
  }
}

async function assertBeatsOwnedAndEligible(
  beatIds: string[],
  producerId: string,
  currentPackId?: string
) {
  const beats = await beatRepository.findByIds(beatIds, true);
  if (beats.length !== beatIds.length) {
    throw new ValidationError("Validation failed", {
      beatIds: ["One or more beats are invalid"],
    });
  }

  for (const beat of beats) {
    if (beat.producerId.toString() !== producerId) {
      throw new ForbiddenError("All beats in a pack must belong to the same producer");
    }
    const beatPackId = beat.packId?.toString();
    if (beatPackId && beatPackId !== currentPackId) {
      throw new ConflictError(`"${beat.title}" is already assigned to another pack`);
    }
  }
  return beats;
}

export const beatPackService = {
  async create(input: CreateBeatPackInput, producerId: string, userRole: string): Promise<IBeatPack> {
    await assertProducer(producerId, userRole, producerId);
    const beats = await assertBeatsOwnedAndEligible(input.beatIds, producerId);

    if (input.status === "published" && beats.some((beat) => !beat.isPublished || beat.status !== "published")) {
      throw new ConflictError("All beats must be published before publishing a pack");
    }

    const status = normalizeStatus(input.status);

    return withTransaction(async (session) => {
      const created = await beatPackRepository.create(
        {
          title: input.title,
          metadata: input.metadata,
          description: input.description,
          producerId: producerId as unknown as IBeatPack["producerId"],
          coverUrl: input.coverUrl || "",
          imageUrls: input.imageUrls || [],
          tags: input.tags,
          beatIds: input.beatIds as unknown as IBeatPack["beatIds"],
          prices: input.prices,
          status: status.status,
          isPublished: status.isPublished,
          salesCount: 0,
        },
        { session }
      );

      await beatRepository.assignPackToBeats(input.beatIds, created._id.toString(), { session });
      return created;
    });
  },

  async update(id: string, input: UpdateBeatPackInput, userId: string, userRole: string): Promise<IBeatPack> {
    const existing = await beatPackRepository.findById(id);
    if (!existing) throw new NotFoundError("Beat pack");

    await assertProducer(userId, userRole, existing.producerId.toString());

    const nextBeatIds = input.beatIds ?? existing.beatIds.map((b) => b.toString());
    const beats = await assertBeatsOwnedAndEligible(nextBeatIds, existing.producerId.toString(), id);

    const nextStatus = normalizeStatus(input.status ?? existing.status);
    if (nextStatus.status === "published" && beats.some((beat) => !beat.isPublished || beat.status !== "published")) {
      throw new ConflictError("All beats must be published before publishing a pack");
    }

    const previousBeatIds = existing.beatIds.map((beatId) => beatId.toString());
    const removedBeatIds = previousBeatIds.filter((beatId) => !nextBeatIds.includes(beatId));
    const addedBeatIds = nextBeatIds.filter((beatId) => !previousBeatIds.includes(beatId));

    const updated = await withTransaction(async (session) => {
      if (removedBeatIds.length > 0) {
        await beatRepository.clearPackFromBeats(removedBeatIds, { session });
      }
      if (addedBeatIds.length > 0) {
        await beatRepository.assignPackToBeats(addedBeatIds, id, { session });
      }
      if (removedBeatIds.length === 0 && addedBeatIds.length === 0 && nextBeatIds.length > 0) {
        await beatRepository.assignPackToBeats(nextBeatIds, id, { session });
      }

      return beatPackRepository.update(
        id,
        {
          ...input,
          beatIds: nextBeatIds as unknown as IBeatPack["beatIds"],
          status: nextStatus.status,
          isPublished: nextStatus.isPublished,
        },
        { session }
      );
    });

    if (!updated) throw new NotFoundError("Beat pack");
    return updated;
  },

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const existing = await beatPackRepository.findById(id);
    if (!existing) throw new NotFoundError("Beat pack");
    await assertProducer(userId, userRole, existing.producerId.toString());

    await withTransaction(async (session) => {
      const beatIds = existing.beatIds.map((beatId) => beatId.toString());
      if (beatIds.length > 0) {
        await beatRepository.clearPackFromBeats(beatIds, { session });
      }
      await beatPackRepository.delete(id, { session });
    });
  },

  async getById(id: string): Promise<IBeatPack> {
    const pack = await beatPackRepository.findById(id);
    if (!pack) throw new NotFoundError("Beat pack");
    return pack;
  },

  async listPublished(filters: BeatPackFilterInput) {
    return beatPackRepository.listPublished(filters.page, filters.limit, filters.search);
  },

  async listByProducer(producerId: string, filters: BeatPackFilterInput) {
    return beatPackRepository.listByProducer(producerId, filters.page, filters.limit, filters.status);
  },

  async listProducerAvailableBeats(userId: string) {
    const beats = await beatRepository.findByProducerId(userId, true);
    return beats.map((beat) => ({
      id: beat._id.toString(),
      title: beat.title,
      genre: beat.genre,
      bpm: beat.bpm,
      duration: beat.duration,
      packId: beat.packId?.toString(),
      saleMode: beat.saleMode ?? "single",
      status: beat.status,
      isPublished: beat.isPublished,
    }));
  },

  async getPackDetail(id: string, includeUnpublished = false) {
    const pack = await this.getById(id);
    if ((!pack.isPublished || pack.status !== "published") && !includeUnpublished) {
      throw new NotFoundError("Beat pack");
    }
    const producer = await userRepository.findById(pack.producerId.toString());
    const beats = await beatRepository.findByIds(pack.beatIds.map((b) => b.toString()));
    return {
      ...pack,
      producerName: producer?.displayName || producer?.name || "Unknown Producer",
      producerUsername: producer?.username || null,
      producerAvatarUrl: producer?.avatarUrl || null,
      beats,
    };
  },
};

