import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { packLicenseService } from "@/lib/services/pack-license.service";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { audit } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 10,
      windowSec: 60,
      prefix: "api:pack-license",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id: packId } = await params;

    const downloadUrl = await packLicenseService.getDownloadUrl(
      session.user.id,
      packId
    );

    audit({
      action: "license_certificate.downloaded",
      userId: session.user.id,
      resourceType: "pack_license_certificate",
      resourceId: packId,
    });

    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
