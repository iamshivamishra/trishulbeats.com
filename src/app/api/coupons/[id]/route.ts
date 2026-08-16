import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { updateCouponSchema } from "@/lib/validators/coupon";
import {
  formatErrorResponse,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

const OBJECT_ID_RE = /^[0-9a-fA-F]{24}$/;

function validateId(id: string): string {
  if (!OBJECT_ID_RE.test(id)) {
    throw new ValidationError("Invalid coupon ID", { id: ["Invalid ID format"] });
  }
  return id;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "coupon-detail" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can view coupons");
    }

    const id = validateId((await params).id);
    const data = await couponService.getAnalytics(id, session.user.id);
    return Response.json(data);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "coupon-update" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can update coupons");
    }

    const id = validateId((await params).id);
    const body = await request.json();
    const input = updateCouponSchema.parse(body);
    const coupon = await couponService.update(id, input, session.user.id);
    return Response.json({ coupon });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "coupon-delete" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can deactivate coupons");
    }

    const id = validateId((await params).id);
    const coupon = await couponService.deactivate(id, session.user.id);
    return Response.json({ coupon });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
