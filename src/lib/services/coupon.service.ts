import { couponRepository } from "@/lib/repositories/coupon.repository";
import { couponUsageRepository } from "@/lib/repositories/coupon-usage.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import type { CreateCouponInput, UpdateCouponInput } from "@/lib/validators/coupon";
import type { ICoupon, ICouponUsage, CouponStatus } from "@/types";

interface CouponValidationResult {
  coupon: ICoupon;
  discountPerPack: Record<string, number>;
  totalDiscount: number;
}

function deriveCouponStatus(coupon: ICoupon): CouponStatus {
  if (coupon.isDraft) return "draft";
  if (!coupon.isActive) return "paused";
  const now = new Date();
  if (now < coupon.startsAt) return "scheduled";
  if (now > coupon.expiresAt) return "expired";
  if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) return "exhausted";
  return "active";
}

function computeDiscount(
  coupon: ICoupon,
  packPrice: number
): number {
  let discount: number;
  if (coupon.discountType === "percentage") {
    discount = Math.round((packPrice * coupon.discountValue) / 100);
  } else {
    discount = Math.min(coupon.discountValue, packPrice);
  }

  if (coupon.maxDiscountCap && discount > coupon.maxDiscountCap) {
    discount = coupon.maxDiscountCap;
  }

  return Math.max(0, discount);
}

export const couponService = {
  async create(
    input: CreateCouponInput,
    producerId: string
  ): Promise<ICoupon> {
    const exists = await couponRepository.codeExists(input.code);
    if (exists) {
      throw new ConflictError("A coupon with this code already exists");
    }

    if (input.applicablePacks.length > 0) {
      const packs = await Promise.all(
        input.applicablePacks.map((id) => beatPackRepository.findById(id))
      );
      for (let i = 0; i < packs.length; i++) {
        const pack = packs[i];
        if (!pack) {
          throw new NotFoundError(`Beat pack ${input.applicablePacks[i]}`);
        }
        if (pack.producerId.toString() !== producerId) {
          throw new ForbiddenError("You can only create coupons for your own beat packs");
        }
      }
    }

    const coupon = await couponRepository.create({
      ...input,
      producerId: producerId as unknown as ICoupon["producerId"],
      currentUses: 0,
      isDraft: true,
      isActive: true,
    });

    audit({
      action: "coupon.created",
      userId: producerId,
      resourceType: "coupon",
      resourceId: coupon._id.toString(),
      metadata: { code: coupon.code, discountType: coupon.discountType },
    });

    return coupon;
  },

  async update(
    couponId: string,
    input: UpdateCouponInput,
    producerId: string
  ): Promise<ICoupon> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon");
    if (coupon.producerId.toString() !== producerId) {
      throw new ForbiddenError("You can only edit your own coupons");
    }

    if (input.applicablePacks && input.applicablePacks.length > 0) {
      const packs = await Promise.all(
        input.applicablePacks.map((id) => beatPackRepository.findById(id))
      );
      for (let i = 0; i < packs.length; i++) {
        if (!packs[i] || packs[i]!.producerId.toString() !== producerId) {
          throw new ForbiddenError("You can only assign coupons to your own beat packs");
        }
      }
    }

    const updated = await couponRepository.update(couponId, input);
    if (!updated) throw new NotFoundError("Coupon");

    audit({
      action: "coupon.updated",
      userId: producerId,
      resourceType: "coupon",
      resourceId: couponId,
    });

    return updated;
  },

  async deactivate(couponId: string, producerId: string): Promise<ICoupon> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon");
    if (coupon.producerId.toString() !== producerId) {
      throw new ForbiddenError("You can only deactivate your own coupons");
    }

    const updated = await couponRepository.deactivate(couponId);
    if (!updated) throw new NotFoundError("Coupon");

    audit({
      action: "coupon.deactivated",
      userId: producerId,
      resourceType: "coupon",
      resourceId: couponId,
      metadata: { code: coupon.code },
    });

    return updated;
  },

  async findById(couponId: string, producerId: string): Promise<ICoupon & { status: CouponStatus }> {
    const coupon = await couponRepository.findById(couponId);
    if (!coupon) throw new NotFoundError("Coupon");
    if (coupon.producerId.toString() !== producerId) {
      throw new ForbiddenError("You can only view your own coupons");
    }
    return { ...coupon, status: deriveCouponStatus(coupon) };
  },

  async listByProducer(
    producerId: string
  ): Promise<Array<ICoupon & { status: CouponStatus }>> {
    const coupons = await couponRepository.findByProducer(producerId);
    return coupons.map((c) => ({ ...c, status: deriveCouponStatus(c) }));
  },

  /**
   * Validate a coupon code for a given buyer and a set of pack IDs.
   * Returns the discount breakdown per pack, or throws on invalid coupon.
   */
  async validateCoupon(
    code: string,
    userId: string,
    userEmail: string,
    packIds: string[],
    packPrices: Record<string, number>
  ): Promise<CouponValidationResult> {
    const coupon = await couponRepository.findByCode(code);
    if (!coupon) {
      throw new ValidationError("Invalid coupon code", {
        code: ["Coupon not found"],
      });
    }

    const status = deriveCouponStatus(coupon);
    if (status !== "active") {
      const messages: Record<string, string> = {
        draft: "This coupon is not yet published",
        paused: "This coupon is currently paused",
        scheduled: "This coupon is not yet active",
        expired: "This coupon has expired",
        exhausted: "This coupon has been fully redeemed",
      };
      throw new ValidationError(messages[status] ?? "Coupon unavailable", {
        code: [messages[status] ?? "Coupon unavailable"],
      });
    }

    // Per-user usage limit
    if (coupon.maxUsesPerUser > 0) {
      const userUsage = await couponUsageRepository.countByUserAndCoupon(
        userId,
        coupon._id.toString()
      );
      if (userUsage >= coupon.maxUsesPerUser) {
        throw new ValidationError("You have already used this coupon", {
          code: ["Per-user usage limit reached"],
        });
      }
    }

    // Customer restrictions
    const hasUserRestrictions = coupon.restrictedToUsers.length > 0;
    const hasEmailRestrictions = coupon.restrictedToEmails.length > 0;
    if (hasUserRestrictions || hasEmailRestrictions) {
      const userIdAllowed = hasUserRestrictions &&
        coupon.restrictedToUsers.some((id) => id.toString() === userId);
      const emailAllowed = hasEmailRestrictions &&
        coupon.restrictedToEmails.some(
          (e) => e.toLowerCase() === userEmail.toLowerCase()
        );
      if (!userIdAllowed && !emailAllowed) {
        throw new ValidationError("This coupon is not available for your account", {
          code: ["Not eligible for this coupon"],
        });
      }
    }

    // Determine applicable packs
    const applicablePackIds =
      coupon.applicablePacks.length > 0
        ? packIds.filter((pid) =>
            coupon.applicablePacks.some((ap) => ap.toString() === pid)
          )
        : packIds;

    if (applicablePackIds.length === 0) {
      throw new ValidationError("This coupon doesn't apply to any items in your cart", {
        code: ["No applicable packs"],
      });
    }

    // Compute per-pack discounts
    const discountPerPack: Record<string, number> = {};
    let totalDiscount = 0;
    for (const pid of applicablePackIds) {
      const price = packPrices[pid] ?? 0;
      const discount = computeDiscount(coupon, price);
      discountPerPack[pid] = discount;
      totalDiscount += discount;
    }

    // Minimum order check (after discount)
    if (coupon.minOrderAmount) {
      const totalBeforeDiscount = Object.values(packPrices).reduce(
        (s, p) => s + p,
        0
      );
      if (totalBeforeDiscount < coupon.minOrderAmount) {
        throw new ValidationError(
          `Minimum order amount is ₹${coupon.minOrderAmount}`,
          { code: [`Order must be at least ₹${coupon.minOrderAmount}`] }
        );
      }
    }

    return { coupon, discountPerPack, totalDiscount };
  },

  /**
   * Record coupon usage after successful payment.
   * Uses atomic conditional increment to prevent over-redemption.
   * Idempotent: duplicate calls for the same orderId are silently ignored
   * via the unique compound index on CouponUsage.
   */
  async recordUsage(
    couponId: string,
    userId: string,
    orderId: string,
    packIds: string[],
    discountPerPack: Record<string, number>,
    maxUses: number = 0
  ): Promise<void> {
    const incremented = await couponRepository.incrementUsageIfAllowed(
      couponId,
      maxUses
    );
    if (!incremented) {
      logger.warn("Coupon usage increment rejected (exhausted or inactive)", {
        couponId,
        orderId,
      });
      return;
    }

    const applicablePacks = packIds.filter(
      (pid) => (discountPerPack[pid] ?? 0) > 0
    );
    for (const pid of applicablePacks) {
      try {
        await couponUsageRepository.create({
          couponId: couponId as unknown as ICouponUsage["couponId"],
          userId: userId as unknown as ICouponUsage["userId"],
          orderId,
          packId: pid as unknown as ICouponUsage["packId"],
          discount: discountPerPack[pid],
        });
      } catch (error) {
        const mongoError = error as { code?: number };
        if (mongoError.code === 11000) {
          logger.info("Duplicate coupon usage record skipped", {
            couponId,
            orderId,
            packId: pid,
          });
          continue;
        }
        throw error;
      }
    }

    const totalDiscount = Object.values(discountPerPack).reduce(
      (s, d) => s + d,
      0
    );
    audit({
      action: "coupon.applied",
      userId,
      resourceType: "coupon",
      resourceId: couponId,
      metadata: {
        orderId,
        totalDiscount,
        packCount: packIds.length,
      },
    });
  },

  async getAnalytics(
    couponId: string,
    producerId: string
  ): Promise<{
    coupon: ICoupon & { status: CouponStatus };
    usages: ICouponUsage[];
    totalDiscount: number;
  }> {
    const coupon = await this.findById(couponId, producerId);
    const [usages, totalDiscount] = await Promise.all([
      couponUsageRepository.findByCoupon(couponId),
      couponUsageRepository.totalDiscountByCoupon(couponId),
    ]);
    return { coupon, usages, totalDiscount };
  },

  /**
   * Validate a coupon from a cart context, resolving pack prices internally
   * so that API routes don't need to import repositories.
   */
  async validateFromCart(
    code: string,
    userId: string,
    userEmail: string,
    packIds: string[],
    tiers: Record<string, string> = {}
  ): Promise<CouponValidationResult> {
    const packPrices: Record<string, number> = {};
    for (const packId of packIds) {
      const pack = await beatPackRepository.findById(packId);
      if (!pack) continue;
      const tier = (tiers[packId] ?? "basic") as keyof typeof pack.prices;
      packPrices[packId] = pack.prices[tier] ?? pack.prices.basic;
    }
    return this.validateCoupon(code, userId, userEmail, packIds, packPrices);
  },

  async findByCode(code: string): Promise<ICoupon | null> {
    return couponRepository.findByCode(code);
  },

  async codeExists(code: string, excludeId?: string): Promise<boolean> {
    return couponRepository.codeExists(code, excludeId);
  },

  deriveCouponStatus,
};
