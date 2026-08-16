import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/Purchase", () => ({
  default: {
    create: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    distinct: vi.fn(),
  },
}));
vi.mock("@/lib/security/object-id", () => ({
  toValidObjectIdOrNull: vi.fn((id: string) => id),
}));
vi.mock("mongoose", () => ({
  default: {
    Types: {
      ObjectId: vi.fn((id: string) => id),
    },
  },
}));

import Purchase from "@/lib/models/Purchase";
import { purchaseRepository } from "./purchase.repository";

function chainable(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.skip = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.session = vi.fn().mockReturnValue(chain);
  chain.populate = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  chain.distinct = vi.fn().mockReturnValue({ session: vi.fn().mockResolvedValue(result) });
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const mockPurchase = {
  _id: "p1",
  buyerId: "buyer1",
  beatId: "beat1",
  licenseId: "lic1",
  licenseType: "basic",
  amount: 500,
};

describe("purchaseRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("with session uses array form", async () => {
      const session = {} as never;
      vi.mocked(Purchase.create).mockResolvedValue([
        { toObject: () => mockPurchase },
      ] as never);

      const result = await purchaseRepository.create(
        { buyerId: "buyer1" },
        { session }
      );

      expect(result).toEqual(mockPurchase);
      expect(Purchase.create).toHaveBeenCalledWith([{ buyerId: "buyer1" }], {
        session,
      });
    });

    it("without session uses object form", async () => {
      vi.mocked(Purchase.create).mockResolvedValue({
        toObject: () => mockPurchase,
      } as never);

      const result = await purchaseRepository.create({ buyerId: "buyer1" });

      expect(result).toEqual(mockPurchase);
      expect(Purchase.create).toHaveBeenCalledWith({ buyerId: "buyer1" });
    });
  });

  describe("hasPurchased", () => {
    it("returns true when count > 0", async () => {
      vi.mocked(Purchase.countDocuments).mockReturnValue(chainable(1) as never);

      const result = await purchaseRepository.hasPurchased("buyer1", "beat1");

      expect(result).toBe(true);
    });

    it("returns false when count is 0", async () => {
      vi.mocked(Purchase.countDocuments).mockReturnValue(chainable(0) as never);

      const result = await purchaseRepository.hasPurchased("buyer1", "beat1");

      expect(result).toBe(false);
    });
  });

  describe("hasPurchasedBatch", () => {
    it("returns empty Set for empty input", async () => {
      const result = await purchaseRepository.hasPurchasedBatch("buyer1", []);

      expect(result).toEqual(new Set());
      expect(Purchase.find).not.toHaveBeenCalled();
    });

    it("returns Set of purchased beat ids", async () => {
      const chain = chainable(null);
      chain.distinct = vi.fn().mockReturnValue({
        session: vi.fn().mockResolvedValue(["beat1", "beat2"]),
      });
      vi.mocked(Purchase.find).mockReturnValue(chain as never);

      const result = await purchaseRepository.hasPurchasedBatch("buyer1", [
        "beat1",
        "beat2",
        "beat3",
      ]);

      expect(result).toEqual(new Set(["beat1", "beat2"]));
    });
  });

  describe("countByBeat", () => {
    it("calls countDocuments with beatId", async () => {
      vi.mocked(Purchase.countDocuments).mockReturnValue(chainable(3) as never);

      const result = await purchaseRepository.countByBeat("beat1");

      expect(result).toBe(3);
      expect(Purchase.countDocuments).toHaveBeenCalledWith({ beatId: "beat1" });
    });
  });

  describe("countByLicense", () => {
    it("calls countDocuments with licenseId", async () => {
      vi.mocked(Purchase.countDocuments).mockReturnValue(chainable(7) as never);

      const result = await purchaseRepository.countByLicense("lic1");

      expect(result).toBe(7);
      expect(Purchase.countDocuments).toHaveBeenCalledWith({ licenseId: "lic1" });
    });
  });

  describe("countByBuyer", () => {
    it("calls countDocuments with buyerId", async () => {
      vi.mocked(Purchase.countDocuments).mockResolvedValue(10 as never);

      const result = await purchaseRepository.countByBuyer("buyer1");

      expect(result).toBe(10);
      expect(Purchase.countDocuments).toHaveBeenCalledWith({ buyerId: "buyer1" });
    });
  });

  describe("upgradeTier", () => {
    it("calls findOneAndUpdate with upgrade data", async () => {
      const upgraded = { ...mockPurchase, licenseType: "premium" };
      vi.mocked(Purchase.findOneAndUpdate).mockReturnValue(chainable(upgraded) as never);

      const upgradeData = {
        licenseId: "lic2",
        licenseType: "premium",
        includesWav: true,
        includesStems: false,
        upgradedFrom: "lic1",
        orderId: "order1",
        paymentId: "pay1",
        upgradeAmount: 300,
      };

      const result = await purchaseRepository.upgradeTier(
        "buyer1",
        "beat1",
        upgradeData
      );

      expect(result).toEqual(upgraded);
      expect(Purchase.findOneAndUpdate).toHaveBeenCalledWith(
        { buyerId: "buyer1", beatId: "beat1" },
        {
          licenseId: "lic2",
          licenseType: "premium",
          includesWav: true,
          includesStems: false,
          upgradedFrom: "lic1",
          upgradedAt: expect.any(Date),
          $inc: { amount: 300 },
        },
        { new: true, session: null }
      );
    });
  });

  describe("getEarningsByProducer", () => {
    it("uses aggregate and returns total", async () => {
      vi.mocked(Purchase.aggregate).mockResolvedValue([{ total: 5000 }] as never);

      const result = await purchaseRepository.getEarningsByProducer("producer1");

      expect(result).toBe(5000);
      expect(Purchase.aggregate).toHaveBeenCalled();
    });

    it("returns 0 when no results", async () => {
      vi.mocked(Purchase.aggregate).mockResolvedValue([] as never);

      const result = await purchaseRepository.getEarningsByProducer("producer1");

      expect(result).toBe(0);
    });

    it("returns 0 for invalid producer id", async () => {
      const { toValidObjectIdOrNull } = await import("@/lib/security/object-id");
      vi.mocked(toValidObjectIdOrNull).mockReturnValue(null);

      const result = await purchaseRepository.getEarningsByProducer("invalid");

      expect(result).toBe(0);
    });
  });

  describe("getPurchasedBeatIds", () => {
    it("returns string array of beat ids", async () => {
      const purchases = [
        { beatId: { toString: () => "beat1" } },
        { beatId: { toString: () => "beat2" } },
      ];
      vi.mocked(Purchase.find).mockReturnValue(chainable(purchases) as never);

      const result = await purchaseRepository.getPurchasedBeatIds("buyer1");

      expect(result).toEqual(["beat1", "beat2"]);
    });
  });

  describe("findByBuyerId", () => {
    it("returns purchases sorted by date", async () => {
      vi.mocked(Purchase.find).mockReturnValue(chainable([mockPurchase]) as never);

      const result = await purchaseRepository.findByBuyerId("buyer1");

      expect(result).toEqual([mockPurchase]);
      expect(Purchase.find).toHaveBeenCalledWith({ buyerId: "buyer1" });
    });
  });

  describe("findByBuyerAndBeatIds", () => {
    it("returns empty array for empty beatIds", async () => {
      const result = await purchaseRepository.findByBuyerAndBeatIds("buyer1", []);

      expect(result).toEqual([]);
      expect(Purchase.find).not.toHaveBeenCalled();
    });
  });
});
