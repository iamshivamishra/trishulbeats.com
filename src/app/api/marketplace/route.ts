import { NextRequest } from "next/server";
import { marketplaceService } from "@/lib/services/marketplace.service";
import { beatFilterSchema } from "@/lib/validators/beat";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "api:marketplace" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = beatFilterSchema.parse(params);
    const result = await marketplaceService.list(filters);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
