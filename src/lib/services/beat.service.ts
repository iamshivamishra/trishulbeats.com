import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { withTransaction } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "@/lib/errors";
import { LICENSE_DEFAULTS } from "@/lib/validators/license";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type {
  CreateBeatInput,
  BeatFilterInput,
} from "@/lib/validators/beat";
import type {
  IBeat,
  BeatStatus,
  BeatFilters,
  PaginatedResult,
} from "@/types";

export const beatService = {
  async create(
    input: CreateBeatInput,
    producerId: string,
    audioTaggedUrl: string,
    audioFullUrl: string,
    coverUrl?: string,
    stemsUrl?: string,
    storageKeys?: IBeat["storageKeys"]
  ): Promise<IBeat> {
    const status = input.status || "draft";
    const isPublished = status === "published";

    const beat = await withTransaction(async (session) => {
      const createdBeat = await beatRepository.create(
        {
          ...input,
          producerId: producerId as unknown as IBeat["producerId"],
          audioTaggedUrl,
          audioFullUrl,
          stemsUrl,
          coverUrl: coverUrl || "",
          storageKeys,
          status,
          plays: 0,
          salesCount: 0,
          likesCount: 0,
          isPublished,
          saleMode: "single",
          packId: undefined,
        },
        { session }
      );

      const defaultLicenses = Object.entries(LICENSE_DEFAULTS).map(
        ([type, defaults]) => {
          const override =
            input.licenses?.[type as "basic" | "premium" | "unlimited"];

          return {
            beatId: createdBeat._id,
            type: type as "basic" | "premium" | "unlimited",
            name: defaults.name,
            price: override?.price ?? defaults.price,
            streamLimit: defaults.streamLimit,
            includesWav: defaults.includesWav,
            includesStems: defaults.includesStems,
            commercialUse: defaults.commercialUse,
            terms: defaults.terms,
            isActive: true,
          };
        }
      );

      await licenseRepository.createMany(defaultLicenses, { session });

      return createdBeat;
    });

    logger.info("Beat created", {
      beatId: beat._id,
      producerId,
      status,
    });

    audit({
      action: "beat.create",
      userId: producerId,
      resourceType: "beat",
      resourceId: beat._id.toString(),
    });

    return beat;
  },

  async list(filters: BeatFilterInput): Promise<PaginatedResult<IBeat>> {
    const beatFilters: BeatFilters = {
      genre: filters.genre,
      key: filters.key,
      mood: filters.mood,
      search: filters.search,
      producer: filters.producer,
      producerId: filters.producerId,
      bpm:
        filters.bpmMin || filters.bpmMax
          ? {
              min: filters.bpmMin,
              max: filters.bpmMax,
            }
          : undefined,
      tags: filters.tags ? filters.tags.split(",") : undefined,
      isPublished: true,
    };

    return beatRepository.findWithFilters(
      beatFilters,
      filters.page,
      filters.limit,
      filters.sort
    );
  },

  async listByProducer(
    producerId: string,
    status?: BeatStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IBeat>> {
    return beatRepository.findByProducerPaginated(
      producerId,
      status,
      page,
      limit
    );
  },

  async getById(
    id: string,
    includeFullAudio = false
  ): Promise<IBeat> {
    const beat = await beatRepository.findById(
      id,
      includeFullAudio
    );

    if (!beat) {
      throw new NotFoundError("Beat");
    }

    return beat;
  },

  async update(
    id: string,
    userId: string,
    userRole: string,
    data: Partial<IBeat>
  ): Promise<IBeat> {
    const beat = await this.getById(id);

    if (
      beat.producerId.toString() !== userId &&
      userRole !== "admin"
    ) {
      throw new ForbiddenError(
        "You can only edit your own beats"
      );
    }

    if (data.status !== undefined) {
      data.isPublished = data.status === "published";
    }

    const updated = await beatRepository.update(id, data);

    if (!updated) {
      throw new NotFoundError("Beat");
    }

    logger.info("Beat updated", {
      beatId: id,
      status: data.status,
    });

    audit({
      action: "beat.update",
      userId,
      resourceType: "beat",
      resourceId: id,
    });

    return updated;
  },

  async publish(
    id: string,
    userId: string,
    userRole: string
  ): Promise<IBeat> {
    return this.update(id, userId, userRole, {
      status: "published" as IBeat["status"],
      isPublished: true,
    });
  },

  async unpublish(
    id: string,
    userId: string,
    userRole: string
  ): Promise<IBeat> {
    return this.update(id, userId, userRole, {
      status: "draft" as IBeat["status"],
      isPublished: false,
    });
  },

  async archive(
    id: string,
    userId: string,
    userRole: string
  ): Promise<IBeat> {
    return this.update(id, userId, userRole, {
      status: "archived" as IBeat["status"],
      isPublished: false,
    });
  },

  async delete(
    id: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const beat = await this.getById(id);

    if (
      beat.producerId.toString() !== userId &&
      userRole !== "admin"
    ) {
      throw new ForbiddenError(
        "You can only delete your own beats"
      );
    }

    const purchasesCount =
      await purchaseRepository.countByBeat(id);

    if (purchasesCount > 0) {
      throw new ConflictError(
        "Cannot delete beat because it already has purchases"
      );
    }

    await withTransaction(async (session) => {
      await licenseRepository.deleteByBeatId(id, {
        session,
      });

      await beatRepository.delete(id, {
        session,
      });
    });

    logger.info("Beat deleted", {
      beatId: id,
      deletedBy: userId,
    });

    audit({
      action: "beat.delete",
      userId,
      resourceType: "beat",
      resourceId: id,
    });
  },

  async incrementPlays(id: string): Promise<void> {
    await beatRepository.incrementPlays(id);
  },

  async getRecent(limit = 8): Promise<IBeat[]> {
    return beatRepository.findRecent(limit);
  },

  async getTrending(limit = 8): Promise<IBeat[]> {
    return beatRepository.findTrending(limit);
  },

  async getProducerStats(producerId: string) {
    const [total, published, drafts] = await Promise.all([
      beatRepository.countByProducer(producerId),
      beatRepository.countByProducerAndStatus(
        producerId,
        "published"
      ),
      beatRepository.countByProducerAndStatus(
        producerId,
        "draft"
      ),
    ]);

    return {
      total,
      published,
      drafts,
    };
  },
};