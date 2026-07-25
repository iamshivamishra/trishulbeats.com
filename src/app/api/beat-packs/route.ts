import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { beatPackFilterSchema, createBeatPackSchema } from "@/lib/validators/beat-pack";
import { formatErrorResponse, UnauthorizedError, ForbiddenError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "api:beat-packs" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = beatPackFilterSchema.parse(params);
    const result = await beatPackService.listPublished(filters);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can create beat packs");
    }

    const body = await request.json();
    const input = createBeatPackSchema.parse(body);
    const pack = await beatPackService.create(input, session.user.id, session.user.role);
    return Response.json({ pack }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

