import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { verifyPaymentSchema } from "@/lib/validators/payment";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "payment-verify" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const input = verifyPaymentSchema.parse(body);

    const result = await paymentService.verifyAndRecord(input, session.user.id);

    return Response.json({
      success: true,
      order: result.order,
      purchases: result.purchases,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
