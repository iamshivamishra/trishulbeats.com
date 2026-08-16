import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { downloadService } from "@/lib/services/download.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/beats/[id]/download-links
 *
 * Returns download entitlements (available files + lock reasons) for a purchased beat.
 * No signed URLs are included — those are generated on-demand via /api/beats/[id]/download.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "download-links" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const entitlements = await downloadService.getEntitlements(session.user.id, id);

    return Response.json(entitlements);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
