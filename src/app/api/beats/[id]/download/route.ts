import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { downloadService, type DownloadFileType } from "@/lib/services/download.service";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const VALID_TYPES: DownloadFileType[] = ["preview", "master", "stems"];

/**
 * GET /api/beats/[id]/download?type=master
 *
 * Returns a 302 redirect to a signed, time-limited R2 download URL.
 * Validates ownership and license entitlements before generating the URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "download" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const typeParam = request.nextUrl.searchParams.get("type") || "master";
    const fileType = VALID_TYPES.includes(typeParam as DownloadFileType)
      ? (typeParam as DownloadFileType)
      : "master";

    // If ?json=true, return the signed URL as JSON instead of redirecting
    const asJson = request.nextUrl.searchParams.get("json") === "true";

    const { url, filename } = await downloadService.getSignedUrl(
      session.user.id,
      id,
      fileType
    );

    if (asJson) {
      return Response.json({
        url,
        filename,
        expiresIn: storageService.SIGNED_URL_TTL_SECONDS,
      });
    }

    return NextResponse.redirect(url, { status: 302 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
