import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { createOrderSchema, createPackOrderSchema, createUpgradeOrderSchema, checkoutCartSchema } from "@/lib/validators/payment";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "payment" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();

    if (body.fromCart && body.includePackCart) {
      const order = await paymentService.checkoutCombined(session.user.id);
      return Response.json(order);
    }

    if (body.fromCart) {
      const input = checkoutCartSchema.parse(body);
      const order = await paymentService.checkoutCart(input, session.user.id);
      return Response.json(order);
    }

    if (body.packId && body.targetTier) {
      const input = createUpgradeOrderSchema.parse(body);
      const order = await paymentService.createUpgradeOrder(input, session.user.id);
      return Response.json(order);
    }

    if (body.packId) {
      const input = createPackOrderSchema.parse(body);
      const order = await paymentService.createPackOrder(input, session.user.id);
      return Response.json(order);
    }

    const input = createOrderSchema.parse(body);
    const order = await paymentService.createOrder(input, session.user.id);
    return Response.json(order);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
