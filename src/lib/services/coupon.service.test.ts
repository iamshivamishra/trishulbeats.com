import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/repositories/coupon.repository", () => ({
  couponRepository: {
    findByCode: vi.fn(),
    findById: vi.fn(),
    findByProducer: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    deactivate: vi.fn(),
    incrementUsage: vi.fn(),
    codeExists: vi.fn(),
    countByProducer: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/coupon-usage.repository", () => ({
  couponUsageRepository: {
    create: vi.fn(),
    countByUserAndCoupon: vi.fn(),
    findByCoupon: vi.fn(),
    findByOrder: vi.fn(),
    totalDiscountByCoupon: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat-pack.repository", () => ({
  beatPackRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { couponService } from "./coupon.service";
import { couponRepository } from "@/lib/repositories/coupon.repository";
import { couponUsageRepository } from "@/lib/repositories/coupon-usage.repository";
import type { ICoupon } from "@/types";

const mockedCouponRepo = vi.mocked(couponRepository);
const mockedUsageRepo = vi.mocked(couponUsageRepository);

function makeCoupon(overrides: Partial<ICoupon> = {}): ICoupon {
  return {
    _id: "coupon1",
    code: "SAVE20",
    producerId: "producer1",
    discountType: "percentage",
    discountValue: 20,
    applicablePacks: [],
    restrictedToUsers: [],
    restrictedToEmails: [],
    startsAt: new Date(Date.now() - 86400000),
    expiresAt: new Date(Date.now() + 86400000 * 30),
    maxUses: 0,
    maxUsesPerUser: 1,
    currentUses: 0,
    isDraft: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ICoupon;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("couponService.validateCoupon", () => {
  it("returns discount for valid percentage coupon", async () => {
    const coupon = makeCoupon();
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(0);

    const result = await couponService.validateCoupon(
      "SAVE20",
      "buyer1",
      "buyer@test.com",
      ["pack1"],
      { pack1: 1000 }
    );

    expect(result.totalDiscount).toBe(200);
    expect(result.discountPerPack.pack1).toBe(200);
  });

  it("returns flat discount capped at pack price", async () => {
    const coupon = makeCoupon({ discountType: "flat", discountValue: 5000 });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(0);

    const result = await couponService.validateCoupon(
      "SAVE20",
      "buyer1",
      "buyer@test.com",
      ["pack1"],
      { pack1: 1000 }
    );

    expect(result.totalDiscount).toBe(1000);
  });

  it("applies maxDiscountCap", async () => {
    const coupon = makeCoupon({ discountValue: 50, maxDiscountCap: 100 });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(0);

    const result = await couponService.validateCoupon(
      "SAVE20",
      "buyer1",
      "buyer@test.com",
      ["pack1"],
      { pack1: 1000 }
    );

    expect(result.totalDiscount).toBe(100);
  });

  it("throws on expired coupon", async () => {
    const coupon = makeCoupon({
      expiresAt: new Date(Date.now() - 1000),
    });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("expired");
  });

  it("throws on draft coupon", async () => {
    const coupon = makeCoupon({ isDraft: true });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("not yet published");
  });

  it("throws on paused coupon", async () => {
    const coupon = makeCoupon({ isActive: false });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("currently paused");
  });

  it("throws on exhausted coupon", async () => {
    const coupon = makeCoupon({ maxUses: 5, currentUses: 5 });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("fully redeemed");
  });

  it("throws on per-user limit reached", async () => {
    const coupon = makeCoupon({ maxUsesPerUser: 1 });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(1);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("already used");
  });

  it("throws on coupon not found", async () => {
    mockedCouponRepo.findByCode.mockResolvedValue(null);

    await expect(
      couponService.validateCoupon("FAKE", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("Invalid coupon code");
  });

  it("filters applicable packs", async () => {
    const coupon = makeCoupon({ applicablePacks: ["pack2" as unknown as ICoupon["applicablePacks"][0]] });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(0);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("doesn't apply");
  });

  it("enforces email restriction", async () => {
    const coupon = makeCoupon({ restrictedToEmails: ["vip@test.com"] });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(0);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "other@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("not available for your account");
  });

  it("allows matching email restriction", async () => {
    const coupon = makeCoupon({ restrictedToEmails: ["buyer@test.com"] });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(0);

    const result = await couponService.validateCoupon(
      "SAVE20",
      "buyer1",
      "buyer@test.com",
      ["pack1"],
      { pack1: 1000 }
    );

    expect(result.totalDiscount).toBe(200);
  });

  it("enforces minimum order amount", async () => {
    const coupon = makeCoupon({ minOrderAmount: 2000 });
    mockedCouponRepo.findByCode.mockResolvedValue(coupon);
    mockedUsageRepo.countByUserAndCoupon.mockResolvedValue(0);

    await expect(
      couponService.validateCoupon("SAVE20", "buyer1", "buyer@test.com", ["pack1"], { pack1: 1000 })
    ).rejects.toThrow("Minimum order amount");
  });
});

describe("couponService.deriveCouponStatus", () => {
  it("returns draft when isDraft is true", () => {
    expect(couponService.deriveCouponStatus(makeCoupon({ isDraft: true }))).toBe("draft");
  });

  it("returns paused when isActive is false", () => {
    expect(couponService.deriveCouponStatus(makeCoupon({ isActive: false }))).toBe("paused");
  });

  it("returns scheduled when before start date", () => {
    expect(
      couponService.deriveCouponStatus(
        makeCoupon({ startsAt: new Date(Date.now() + 86400000) })
      )
    ).toBe("scheduled");
  });

  it("returns expired when past expiry", () => {
    expect(
      couponService.deriveCouponStatus(
        makeCoupon({ expiresAt: new Date(Date.now() - 1000) })
      )
    ).toBe("expired");
  });

  it("returns exhausted when maxUses reached", () => {
    expect(
      couponService.deriveCouponStatus(
        makeCoupon({ maxUses: 10, currentUses: 10 })
      )
    ).toBe("exhausted");
  });

  it("returns active for valid coupon", () => {
    expect(couponService.deriveCouponStatus(makeCoupon())).toBe("active");
  });
});
