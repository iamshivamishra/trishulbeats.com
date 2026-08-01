import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { failOrderSchema } from "@/lib/validators/payment";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "payment-fail" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const { orderId, reason } = failOrderSchema.parse(body);

    await paymentService.markFailed(orderId, session.user.id, reason);

    return Response.json({ message: "Order marked as failed" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
