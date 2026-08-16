import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { createCouponSchema } from "@/lib/validators/coupon";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "coupons-list" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can manage coupons");
    }

    const coupons = await couponService.listByProducer(session.user.id);
    return Response.json({ coupons });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "coupons-create" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can create coupons");
    }

    const body = await request.json();
    const input = createCouponSchema.parse(body);
    const coupon = await couponService.create(input, session.user.id);
    return Response.json({ coupon }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
