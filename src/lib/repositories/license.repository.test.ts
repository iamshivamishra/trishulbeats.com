import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/License", () => ({
  default: {
    find: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
    create: vi.fn(),
    insertMany: vi.fn(),
    deleteMany: vi.fn(),
    aggregate: vi.fn(),
  },
}));
vi.mock("mongoose", async () => {
  const actual = await vi.importActual("mongoose");
  function FakeObjectId(id: string) {
    return id;
  }
  return {
    ...actual,
    default: {
      ...(actual as Record<string, unknown>).default,
      Types: { ObjectId: FakeObjectId },
    },
  };
});

import License from "@/lib/models/License";
import { licenseRepository } from "./license.repository";

function chainable(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.skip = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.session = vi.fn().mockReturnValue(chain);
  chain.populate = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const mockLicense = {
  _id: "lic1",
  beatId: "beat1",
  name: "Basic",
  price: 29.99,
  isActive: true,
};

describe("licenseRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByBeatId", () => {
    it("returns licenses sorted by price", async () => {
      const licenses = [mockLicense];
      vi.mocked(License.find).mockReturnValue(chainable(licenses) as never);

      const result = await licenseRepository.findByBeatId("beat1");
      expect(result).toEqual(licenses);
      expect(License.find).toHaveBeenCalledWith({
        beatId: "beat1",
        isActive: true,
      });
    });

    it("includes inactive when activeOnly is false", async () => {
      vi.mocked(License.find).mockReturnValue(chainable([]) as never);

      await licenseRepository.findByBeatId("beat1", false);
      expect(License.find).toHaveBeenCalledWith({ beatId: "beat1" });
    });
  });

  describe("findById", () => {
    it("returns license when found", async () => {
      vi.mocked(License.findById).mockReturnValue(
        chainable(mockLicense) as never
      );

      const result = await licenseRepository.findById("lic1");
      expect(result).toEqual(mockLicense);
    });

    it("returns null when not found", async () => {
      vi.mocked(License.findById).mockReturnValue(chainable(null) as never);

      const result = await licenseRepository.findById("missing");
      expect(result).toBeNull();
    });
  });

  describe("findByIds", () => {
    it("returns empty array for empty ids", async () => {
      const result = await licenseRepository.findByIds([]);
      expect(result).toEqual([]);
      expect(License.find).not.toHaveBeenCalled();
    });

    it("returns licenses for given ids", async () => {
      vi.mocked(License.find).mockReturnValue(
        chainable([mockLicense]) as never
      );

      const result = await licenseRepository.findByIds(["lic1"]);
      expect(result).toEqual([mockLicense]);
    });
  });

  describe("create", () => {
    it("calls License.create and returns object", async () => {
      vi.mocked(License.create).mockResolvedValue({
        toObject: () => mockLicense,
      } as never);

      const result = await licenseRepository.create({ name: "Basic" });
      expect(License.create).toHaveBeenCalledWith({ name: "Basic" });
      expect(result).toEqual(mockLicense);
    });
  });

  describe("createMany", () => {
    it("calls insertMany and returns objects", async () => {
      const lic1 = { ...mockLicense, _id: "lic1" };
      const lic2 = { ...mockLicense, _id: "lic2", name: "Premium" };
      vi.mocked(License.insertMany).mockResolvedValue([
        { toObject: () => lic1 },
        { toObject: () => lic2 },
      ] as never);

      const result = await licenseRepository.createMany([
        { name: "Basic" },
        { name: "Premium" },
      ]);
      expect(result).toEqual([lic1, lic2]);
    });
  });

  describe("update", () => {
    it("returns updated license", async () => {
      const updated = { ...mockLicense, price: 39.99 };
      vi.mocked(License.findByIdAndUpdate).mockReturnValue(
        chainable(updated) as never
      );

      const result = await licenseRepository.update("lic1", { price: 39.99 });
      expect(result).toEqual(updated);
    });
  });

  describe("delete", () => {
    it("returns true when deleted", async () => {
      vi.mocked(License.findByIdAndDelete).mockResolvedValue(
        mockLicense as never
      );

      const result = await licenseRepository.delete("lic1");
      expect(result).toBe(true);
    });

    it("returns false when not found", async () => {
      vi.mocked(License.findByIdAndDelete).mockResolvedValue(null as never);

      const result = await licenseRepository.delete("missing");
      expect(result).toBe(false);
    });
  });

  describe("deleteByBeatId", () => {
    it("calls deleteMany and returns count", async () => {
      vi.mocked(License.deleteMany).mockResolvedValue({
        deletedCount: 3,
      } as never);

      const result = await licenseRepository.deleteByBeatId("beat1");
      expect(result).toBe(3);
      expect(License.deleteMany).toHaveBeenCalledWith(
        { beatId: "beat1" },
        { session: undefined }
      );
    });
  });

  describe("findCheapestForBeat", () => {
    it("returns cheapest license", async () => {
      vi.mocked(License.findOne).mockReturnValue(
        chainable(mockLicense) as never
      );

      const result = await licenseRepository.findCheapestForBeat("beat1");
      expect(result).toEqual(mockLicense);
    });

    it("returns null when no licenses exist", async () => {
      vi.mocked(License.findOne).mockReturnValue(chainable(null) as never);

      const result = await licenseRepository.findCheapestForBeat("beat1");
      expect(result).toBeNull();
    });
  });

  describe("findCheapestForBeats", () => {
    it("returns empty object for empty ids", async () => {
      const result = await licenseRepository.findCheapestForBeats([]);
      expect(result).toEqual({});
    });

    it("returns map of cheapest prices", async () => {
      vi.mocked(License.aggregate).mockResolvedValue([
        { _id: "beat1", price: 29.99, licenseId: "lic1" },
        { _id: "beat2", price: 19.99, licenseId: "lic2" },
      ] as never);

      const result = await licenseRepository.findCheapestForBeats([
        "beat1",
        "beat2",
      ]);
      expect(result).toEqual({
        beat1: { price: 29.99, licenseId: "lic1" },
        beat2: { price: 19.99, licenseId: "lic2" },
      });
    });
  });
});
