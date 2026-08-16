import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/lib/errors", () => {
  class ConflictError extends Error {
    statusCode = 409;
    constructor(message = "Resource conflict") {
      super(message);
      this.name = "ConflictError";
    }
  }

  class ForbiddenError extends Error {
    statusCode = 403;
    constructor(message = "You do not have permission to perform this action") {
      super(message);
      this.name = "ForbiddenError";
    }
  }

  class NotFoundError extends Error {
    statusCode = 404;
    constructor(resource: string) {
      super(`${resource} not found`);
      this.name = "NotFoundError";
    }
  }

  return { ConflictError, ForbiddenError, NotFoundError };
});

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(async (operation: (session: object) => Promise<unknown>) =>
    operation({})
  ),
}));

vi.mock("@/lib/validators/license", () => ({
  LICENSE_DEFAULTS: {
    basic: {
      name: "Basic License",
      price: 1999,
      streamLimit: 5000,
      includesWav: false,
      includesStems: false,
      commercialUse: false,
      terms: "Basic terms",
    },
    premium: {
      name: "Premium License",
      price: 4999,
      streamLimit: 50000,
      includesWav: true,
      includesStems: false,
      commercialUse: true,
      terms: "Premium terms",
    },
    unlimited: {
      name: "Unlimited License",
      price: 9999,
      streamLimit: -1,
      includesWav: true,
      includesStems: true,
      commercialUse: true,
      terms: "Unlimited terms",
    },
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    create: vi.fn(),
    findWithFilters: vi.fn(),
    findByProducerPaginated: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    incrementPlays: vi.fn(),
    findRecent: vi.fn(),
    findTrending: vi.fn(),
    countByProducer: vi.fn(),
    countByProducerAndStatus: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    createMany: vi.fn(),
    deleteByBeatId: vi.fn(),
    findCheapestForBeats: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    countByBeat: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/serializers/beat", () => ({
  toPublicBeatForUi: vi.fn(),
}));

import { beatService } from "./beat.service";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { toPublicBeatForUi } from "@/lib/serializers/beat";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";

function makeBeat(overrides: Record<string, unknown> = {}) {
  return {
    _id: "beat1",
    producerId: { toString: () => "producer1" },
    title: "Test Beat",
    genre: "hip-hop",
    bpm: 140,
    key: "C minor",
    status: "published",
    isPublished: true,
    plays: 0,
    salesCount: 0,
    likesCount: 0,
    audioTaggedUrl: "https://cdn.example.com/tagged.mp3",
    audioFullUrl: "https://cdn.example.com/full.mp3",
    coverUrl: "https://cdn.example.com/cover.jpg",
    ...overrides,
  };
}

describe("beatService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ────────────────────────────────────────────
  // create
  // ────────────────────────────────────────────
  describe("create", () => {
    const input = {
      title: "Test Beat",
      genre: "hip-hop",
      bpm: 140,
      key: "C minor",
      status: "draft" as const,
    };
    const producerId = "producer1";
    const audioTaggedUrl = "https://cdn.example.com/tagged.mp3";
    const audioFullUrl = "https://cdn.example.com/full.mp3";

    it("should create a beat with default licenses via transaction", async () => {
      const createdBeat = makeBeat({ _id: "newBeat1", status: "draft", isPublished: false });
      vi.mocked(beatRepository.create).mockResolvedValue(createdBeat as never);
      vi.mocked(licenseRepository.createMany).mockResolvedValue(undefined as never);

      const result = await beatService.create(input, producerId, audioTaggedUrl, audioFullUrl);

      expect(result).toEqual(createdBeat);
      expect(beatRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Test Beat",
          producerId,
          audioTaggedUrl,
          audioFullUrl,
          status: "draft",
          isPublished: false,
          plays: 0,
          salesCount: 0,
          likesCount: 0,
        }),
        expect.objectContaining({ session: expect.any(Object) })
      );
      expect(licenseRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: "basic", beatId: "newBeat1" }),
          expect.objectContaining({ type: "premium", beatId: "newBeat1" }),
          expect.objectContaining({ type: "unlimited", beatId: "newBeat1" }),
        ]),
        expect.objectContaining({ session: expect.any(Object) })
      );
    });

    it("should set isPublished true when status is published", async () => {
      const publishedInput = { ...input, status: "published" as const };
      const createdBeat = makeBeat({ _id: "newBeat2", status: "published", isPublished: true });
      vi.mocked(beatRepository.create).mockResolvedValue(createdBeat as never);
      vi.mocked(licenseRepository.createMany).mockResolvedValue(undefined as never);

      await beatService.create(publishedInput, producerId, audioTaggedUrl, audioFullUrl);

      expect(beatRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "published", isPublished: true }),
        expect.any(Object)
      );
    });

    it("should apply license price overrides from input", async () => {
      const inputWithOverrides = {
        ...input,
        licenses: { basic: { price: 999 }, premium: { price: 2999 }, unlimited: { price: 7999 } },
      };
      const createdBeat = makeBeat({ _id: "newBeat3" });
      vi.mocked(beatRepository.create).mockResolvedValue(createdBeat as never);
      vi.mocked(licenseRepository.createMany).mockResolvedValue(undefined as never);

      await beatService.create(inputWithOverrides, producerId, audioTaggedUrl, audioFullUrl);

      const licenses = vi.mocked(licenseRepository.createMany).mock.calls[0][0] as Array<{
        type: string;
        price: number;
      }>;
      const basicLicense = licenses.find((l) => l.type === "basic");
      expect(basicLicense?.price).toBe(999);
    });

    it("should pass optional coverUrl, stemsUrl, and storageKeys", async () => {
      const createdBeat = makeBeat({ _id: "newBeat4" });
      vi.mocked(beatRepository.create).mockResolvedValue(createdBeat as never);
      vi.mocked(licenseRepository.createMany).mockResolvedValue(undefined as never);

      const storageKeys = { tagged: "key-tagged", full: "key-full" };
      await beatService.create(
        input,
        producerId,
        audioTaggedUrl,
        audioFullUrl,
        "https://cdn.example.com/cover.jpg",
        "https://cdn.example.com/stems.zip",
        storageKeys as never
      );

      expect(beatRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          coverUrl: "https://cdn.example.com/cover.jpg",
          stemsUrl: "https://cdn.example.com/stems.zip",
          storageKeys,
        }),
        expect.any(Object)
      );
    });

    it("should log and audit after creation", async () => {
      const createdBeat = makeBeat({ _id: "newBeat5" });
      vi.mocked(beatRepository.create).mockResolvedValue(createdBeat as never);
      vi.mocked(licenseRepository.createMany).mockResolvedValue(undefined as never);

      await beatService.create(input, producerId, audioTaggedUrl, audioFullUrl);

      expect(logger.info).toHaveBeenCalledWith("Beat created", expect.objectContaining({ beatId: "newBeat5", producerId }));
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "beat.create", userId: producerId, resourceId: "newBeat5" })
      );
    });

    it("should default status to draft when not provided", async () => {
      const { status: _status, ...inputNoStatus } = input;
      const createdBeat = makeBeat({ _id: "newBeat6", status: "draft", isPublished: false });
      vi.mocked(beatRepository.create).mockResolvedValue(createdBeat as never);
      vi.mocked(licenseRepository.createMany).mockResolvedValue(undefined as never);

      await beatService.create(inputNoStatus as never, producerId, audioTaggedUrl, audioFullUrl);

      expect(beatRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: "draft", isPublished: false }),
        expect.any(Object)
      );
    });
  });

  // ────────────────────────────────────────────
  // list
  // ────────────────────────────────────────────
  describe("list", () => {
    it("should always set isPublished to true in filters", async () => {
      const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };
      vi.mocked(beatRepository.findWithFilters).mockResolvedValue(paginatedResult as never);

      await beatService.list({ page: 1, limit: 20 } as never);

      expect(beatRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ isPublished: true }),
        1,
        20,
        undefined
      );
    });

    it("should pass genre, key, mood, and search filters", async () => {
      const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };
      vi.mocked(beatRepository.findWithFilters).mockResolvedValue(paginatedResult as never);

      await beatService.list({
        genre: "trap",
        key: "A minor",
        mood: "dark",
        search: "boom",
        page: 1,
        limit: 10,
        sort: "newest",
      } as never);

      expect(beatRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          genre: "trap",
          key: "A minor",
          mood: "dark",
          search: "boom",
          isPublished: true,
        }),
        1,
        10,
        "newest"
      );
    });

    it("should convert bpmMin/bpmMax into bpm range object", async () => {
      const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };
      vi.mocked(beatRepository.findWithFilters).mockResolvedValue(paginatedResult as never);

      await beatService.list({ bpmMin: 80, bpmMax: 160, page: 1, limit: 20 } as never);

      expect(beatRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ bpm: { min: 80, max: 160 } }),
        1,
        20,
        undefined
      );
    });

    it("should split comma-separated tags into array", async () => {
      const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };
      vi.mocked(beatRepository.findWithFilters).mockResolvedValue(paginatedResult as never);

      await beatService.list({ tags: "dark,trap,808", page: 1, limit: 20 } as never);

      expect(beatRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ tags: ["dark", "trap", "808"] }),
        1,
        20,
        undefined
      );
    });

    it("should leave bpm undefined when no bpmMin/bpmMax provided", async () => {
      const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };
      vi.mocked(beatRepository.findWithFilters).mockResolvedValue(paginatedResult as never);

      await beatService.list({ page: 1, limit: 20 } as never);

      expect(beatRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ bpm: undefined }),
        1,
        20,
        undefined
      );
    });
  });

  // ────────────────────────────────────────────
  // listByProducer
  // ────────────────────────────────────────────
  describe("listByProducer", () => {
    it("should delegate to beatRepository with defaults", async () => {
      const paginatedResult = { data: [], total: 0, page: 1, limit: 20 };
      vi.mocked(beatRepository.findByProducerPaginated).mockResolvedValue(paginatedResult as never);

      const result = await beatService.listByProducer("producer1");

      expect(result).toEqual(paginatedResult);
      expect(beatRepository.findByProducerPaginated).toHaveBeenCalledWith("producer1", undefined, 1, 20);
    });

    it("should forward status filter and pagination", async () => {
      const paginatedResult = { data: [], total: 0, page: 2, limit: 10 };
      vi.mocked(beatRepository.findByProducerPaginated).mockResolvedValue(paginatedResult as never);

      await beatService.listByProducer("producer1", "published" as never, 2, 10);

      expect(beatRepository.findByProducerPaginated).toHaveBeenCalledWith("producer1", "published", 2, 10);
    });
  });

  // ────────────────────────────────────────────
  // getById
  // ────────────────────────────────────────────
  describe("getById", () => {
    it("should return beat when found", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);

      const result = await beatService.getById("beat1");

      expect(result).toEqual(beat);
      expect(beatRepository.findById).toHaveBeenCalledWith("beat1", false);
    });

    it("should pass includeFullAudio flag", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);

      await beatService.getById("beat1", true);

      expect(beatRepository.findById).toHaveBeenCalledWith("beat1", true);
    });

    it("should throw NotFoundError when beat does not exist", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(null as never);

      await expect(beatService.getById("nonexistent")).rejects.toThrow(NotFoundError);
    });
  });

  // ────────────────────────────────────────────
  // update
  // ────────────────────────────────────────────
  describe("update", () => {
    it("should update beat when user is the owner", async () => {
      const beat = makeBeat();
      const updated = makeBeat({ title: "Updated Title" });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(updated as never);

      const result = await beatService.update("beat1", "producer1", "producer", { title: "Updated Title" } as never);

      expect(result).toEqual(updated);
      expect(beatRepository.update).toHaveBeenCalledWith("beat1", { title: "Updated Title" });
    });

    it("should allow admin to update any beat", async () => {
      const beat = makeBeat();
      const updated = makeBeat({ title: "Admin Edit" });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(updated as never);

      const result = await beatService.update("beat1", "admin-user", "admin", { title: "Admin Edit" } as never);

      expect(result).toEqual(updated);
    });

    it("should throw ForbiddenError when non-owner non-admin tries to update", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);

      await expect(
        beatService.update("beat1", "other-user", "producer", { title: "Hack" } as never)
      ).rejects.toThrow(ForbiddenError);
    });

    it("should set isPublished when status is updated", async () => {
      const beat = makeBeat();
      const updated = makeBeat({ status: "published", isPublished: true });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(updated as never);

      await beatService.update("beat1", "producer1", "producer", { status: "published" } as never);

      expect(beatRepository.update).toHaveBeenCalledWith(
        "beat1",
        expect.objectContaining({ status: "published", isPublished: true })
      );
    });

    it("should set isPublished false for non-published status", async () => {
      const beat = makeBeat();
      const updated = makeBeat({ status: "draft", isPublished: false });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(updated as never);

      await beatService.update("beat1", "producer1", "producer", { status: "draft" } as never);

      expect(beatRepository.update).toHaveBeenCalledWith(
        "beat1",
        expect.objectContaining({ status: "draft", isPublished: false })
      );
    });

    it("should throw NotFoundError when update returns null", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(null as never);

      await expect(
        beatService.update("beat1", "producer1", "producer", { title: "X" } as never)
      ).rejects.toThrow(NotFoundError);
    });

    it("should log and audit on successful update", async () => {
      const beat = makeBeat();
      const updated = makeBeat({ title: "Logged" });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(updated as never);

      await beatService.update("beat1", "producer1", "producer", { title: "Logged" } as never);

      expect(logger.info).toHaveBeenCalledWith("Beat updated", expect.objectContaining({ beatId: "beat1" }));
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "beat.update", userId: "producer1", resourceId: "beat1" })
      );
    });
  });

  // ────────────────────────────────────────────
  // publish / unpublish / archive
  // ────────────────────────────────────────────
  describe("publish", () => {
    it("should set status to published and isPublished true", async () => {
      const beat = makeBeat({ status: "draft", isPublished: false });
      const published = makeBeat({ status: "published", isPublished: true });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(published as never);

      const result = await beatService.publish("beat1", "producer1", "producer");

      expect(result).toEqual(published);
      expect(beatRepository.update).toHaveBeenCalledWith(
        "beat1",
        expect.objectContaining({ status: "published", isPublished: true })
      );
    });
  });

  describe("unpublish", () => {
    it("should set status to draft and isPublished false", async () => {
      const beat = makeBeat();
      const unpublished = makeBeat({ status: "draft", isPublished: false });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(unpublished as never);

      const result = await beatService.unpublish("beat1", "producer1", "producer");

      expect(result).toEqual(unpublished);
      expect(beatRepository.update).toHaveBeenCalledWith(
        "beat1",
        expect.objectContaining({ status: "draft", isPublished: false })
      );
    });
  });

  describe("archive", () => {
    it("should set status to archived and isPublished false", async () => {
      const beat = makeBeat();
      const archived = makeBeat({ status: "archived", isPublished: false });
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(beatRepository.update).mockResolvedValue(archived as never);

      const result = await beatService.archive("beat1", "producer1", "producer");

      expect(result).toEqual(archived);
      expect(beatRepository.update).toHaveBeenCalledWith(
        "beat1",
        expect.objectContaining({ status: "archived", isPublished: false })
      );
    });
  });

  // ────────────────────────────────────────────
  // delete
  // ────────────────────────────────────────────
  describe("delete", () => {
    it("should delete beat and its licenses when owner with no purchases", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(purchaseRepository.countByBeat).mockResolvedValue(0 as never);
      vi.mocked(licenseRepository.deleteByBeatId).mockResolvedValue(undefined as never);
      vi.mocked(beatRepository.delete).mockResolvedValue(undefined as never);

      await beatService.delete("beat1", "producer1", "producer");

      expect(licenseRepository.deleteByBeatId).toHaveBeenCalledWith("beat1", expect.objectContaining({ session: expect.any(Object) }));
      expect(beatRepository.delete).toHaveBeenCalledWith("beat1", expect.objectContaining({ session: expect.any(Object) }));
    });

    it("should allow admin to delete any beat", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(purchaseRepository.countByBeat).mockResolvedValue(0 as never);
      vi.mocked(licenseRepository.deleteByBeatId).mockResolvedValue(undefined as never);
      vi.mocked(beatRepository.delete).mockResolvedValue(undefined as never);

      await beatService.delete("beat1", "admin-user", "admin");

      expect(beatRepository.delete).toHaveBeenCalled();
    });

    it("should throw ForbiddenError when non-owner non-admin tries to delete", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);

      await expect(
        beatService.delete("beat1", "other-user", "producer")
      ).rejects.toThrow(ForbiddenError);
    });

    it("should throw ConflictError when beat has purchases", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(purchaseRepository.countByBeat).mockResolvedValue(3 as never);

      await expect(
        beatService.delete("beat1", "producer1", "producer")
      ).rejects.toThrow(ConflictError);
    });

    it("should throw NotFoundError when beat does not exist", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(null as never);

      await expect(
        beatService.delete("nonexistent", "producer1", "producer")
      ).rejects.toThrow(NotFoundError);
    });

    it("should log and audit after deletion", async () => {
      const beat = makeBeat();
      vi.mocked(beatRepository.findById).mockResolvedValue(beat as never);
      vi.mocked(purchaseRepository.countByBeat).mockResolvedValue(0 as never);
      vi.mocked(licenseRepository.deleteByBeatId).mockResolvedValue(undefined as never);
      vi.mocked(beatRepository.delete).mockResolvedValue(undefined as never);

      await beatService.delete("beat1", "producer1", "producer");

      expect(logger.info).toHaveBeenCalledWith("Beat deleted", expect.objectContaining({ beatId: "beat1", deletedBy: "producer1" }));
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "beat.delete", userId: "producer1", resourceId: "beat1" })
      );
    });
  });

  // ────────────────────────────────────────────
  // incrementPlays
  // ────────────────────────────────────────────
  describe("incrementPlays", () => {
    it("should delegate to beatRepository.incrementPlays", async () => {
      vi.mocked(beatRepository.incrementPlays).mockResolvedValue(undefined as never);

      await beatService.incrementPlays("beat1");

      expect(beatRepository.incrementPlays).toHaveBeenCalledWith("beat1");
    });
  });

  // ────────────────────────────────────────────
  // getRecent
  // ────────────────────────────────────────────
  describe("getRecent", () => {
    it("should return recent beats with default limit of 8", async () => {
      const beats = [makeBeat()];
      vi.mocked(beatRepository.findRecent).mockResolvedValue(beats as never);

      const result = await beatService.getRecent();

      expect(result).toEqual(beats);
      expect(beatRepository.findRecent).toHaveBeenCalledWith(8);
    });

    it("should pass custom limit", async () => {
      vi.mocked(beatRepository.findRecent).mockResolvedValue([] as never);

      await beatService.getRecent(4);

      expect(beatRepository.findRecent).toHaveBeenCalledWith(4);
    });
  });

  // ────────────────────────────────────────────
  // getTrending
  // ────────────────────────────────────────────
  describe("getTrending", () => {
    it("should return trending beats with default limit of 8", async () => {
      const beats = [makeBeat()];
      vi.mocked(beatRepository.findTrending).mockResolvedValue(beats as never);

      const result = await beatService.getTrending();

      expect(result).toEqual(beats);
      expect(beatRepository.findTrending).toHaveBeenCalledWith(8);
    });

    it("should pass custom limit", async () => {
      vi.mocked(beatRepository.findTrending).mockResolvedValue([] as never);

      await beatService.getTrending(12);

      expect(beatRepository.findTrending).toHaveBeenCalledWith(12);
    });
  });

  // ────────────────────────────────────────────
  // enrichWithPrices
  // ────────────────────────────────────────────
  describe("enrichWithPrices", () => {
    it("should return empty array for empty input", async () => {
      const result = await beatService.enrichWithPrices([]);

      expect(result).toEqual([]);
      expect(licenseRepository.findCheapestForBeats).not.toHaveBeenCalled();
    });

    it("should enrich beats with starting prices and producer info", async () => {
      const beat1 = makeBeat({ _id: "b1", producerId: { toString: () => "p1" } });
      const beat2 = makeBeat({ _id: "b2", producerId: { toString: () => "p1" } });
      const producer = { _id: { toString: () => "p1" }, name: "Producer One" };
      const cheapestMap = { b1: { price: 1999 }, b2: { price: 4999 } };

      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue(cheapestMap as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue([producer] as never);
      vi.mocked(toPublicBeatForUi).mockImplementation((beat, prod) => ({ ...beat, producer: prod }) as never);

      const result = await beatService.enrichWithPrices([beat1, beat2] as never);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({ startingPrice: 1999 })
      );
      expect(result[1]).toEqual(
        expect.objectContaining({ startingPrice: 4999 })
      );
      expect(toPublicBeatForUi).toHaveBeenCalledTimes(2);
      expect(licenseRepository.findCheapestForBeats).toHaveBeenCalledWith(["b1", "b2"]);
      expect(userRepository.findByIds).toHaveBeenCalledWith(["p1"]);
    });

    it("should deduplicate producer lookups across beats", async () => {
      const beat1 = makeBeat({ _id: "b1", producerId: { toString: () => "p1" } });
      const beat2 = makeBeat({ _id: "b2", producerId: { toString: () => "p1" } });
      const beat3 = makeBeat({ _id: "b3", producerId: { toString: () => "p2" } });
      const producers = [
        { _id: { toString: () => "p1" }, name: "P1" },
        { _id: { toString: () => "p2" }, name: "P2" },
      ];

      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue({} as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue(producers as never);
      vi.mocked(toPublicBeatForUi).mockImplementation((beat) => beat as never);

      await beatService.enrichWithPrices([beat1, beat2, beat3] as never);

      expect(userRepository.findByIds).toHaveBeenCalledWith(["p1", "p2"]);
    });

    it("should handle missing cheapest price gracefully", async () => {
      const beat = makeBeat({ _id: "b1", producerId: { toString: () => "p1" } });
      const producer = { _id: { toString: () => "p1" }, name: "P1" };

      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue({} as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue([producer] as never);
      vi.mocked(toPublicBeatForUi).mockImplementation((b) => b as never);

      const result = await beatService.enrichWithPrices([beat] as never);

      expect(result[0].startingPrice).toBeUndefined();
    });

    it("should handle missing producer gracefully", async () => {
      const beat = makeBeat({ _id: "b1", producerId: { toString: () => "unknown-p" } });

      vi.mocked(licenseRepository.findCheapestForBeats).mockResolvedValue({} as never);
      vi.mocked(userRepository.findByIds).mockResolvedValue([] as never);
      vi.mocked(toPublicBeatForUi).mockImplementation((_b, prod) => ({ producer: prod }) as never);

      const result = await beatService.enrichWithPrices([beat] as never);

      expect(toPublicBeatForUi).toHaveBeenCalledWith(beat, null);
    });
  });

  // ────────────────────────────────────────────
  // getProducerStats
  // ────────────────────────────────────────────
  describe("getProducerStats", () => {
    it("should return total, published, and drafts counts", async () => {
      vi.mocked(beatRepository.countByProducer).mockResolvedValue(10 as never);
      vi.mocked(beatRepository.countByProducerAndStatus).mockResolvedValueOnce(6 as never);
      vi.mocked(beatRepository.countByProducerAndStatus).mockResolvedValueOnce(4 as never);

      const result = await beatService.getProducerStats("producer1");

      expect(result).toEqual({ total: 10, published: 6, drafts: 4 });
      expect(beatRepository.countByProducer).toHaveBeenCalledWith("producer1");
      expect(beatRepository.countByProducerAndStatus).toHaveBeenCalledWith("producer1", "published");
      expect(beatRepository.countByProducerAndStatus).toHaveBeenCalledWith("producer1", "draft");
    });

    it("should return zeros for producer with no beats", async () => {
      vi.mocked(beatRepository.countByProducer).mockResolvedValue(0 as never);
      vi.mocked(beatRepository.countByProducerAndStatus).mockResolvedValue(0 as never);

      const result = await beatService.getProducerStats("new-producer");

      expect(result).toEqual({ total: 0, published: 0, drafts: 0 });
    });
  });
});
