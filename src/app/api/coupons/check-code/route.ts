import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { checkCodeSchema } from "@/lib/validators/coupon";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "coupon-check" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can check coupon codes");
    }

    const body = await request.json();
    const input = checkCodeSchema.parse(body);
    const exists = await couponService.codeExists(input.code, input.excludeId);
    return Response.json({ available: !exists });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
