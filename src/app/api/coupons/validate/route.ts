import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { validateCouponSchema } from "@/lib/validators/coupon";
import {
  formatErrorResponse,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 15,
      windowSec: 60,
      prefix: "coupon-validate",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const input = validateCouponSchema.parse(body);

    const result = await couponService.validateFromCart(
      input.code,
      session.user.id,
      session.user.email ?? "",
      input.packIds,
      input.tiers ?? {}
    );

    return Response.json({
      valid: true,
      code: result.coupon.code,
      discountType: result.coupon.discountType,
      discountValue: result.coupon.discountValue,
      discountPerPack: result.discountPerPack,
      totalDiscount: result.totalDiscount,
    });
  } catch (error) {
    const isKnownError =
      error instanceof ValidationError || error instanceof UnauthorizedError;
    audit({
      action: "coupon.validation_failed",
      metadata: {
        error: isKnownError
          ? (error as Error).message
          : "Unexpected validation error",
      },
    });
    return formatErrorResponse(error);
  }
}
