import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const presignSchema = z.object({
  producerId: z.string().min(1).optional(),
  beatId: z.string().min(1),
  category: z.enum(["preview", "master", "stems", "artwork"]),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

const profilePresignSchema = z.object({
  category: z.enum(["avatar", "cover"]),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

/**
 * POST /api/upload/presign
 *
 * Body: { producerId, beatId, category, contentType, fileSize }
 *   OR  { category: "avatar"|"cover", contentType, fileSize }
 *
 * Returns: { uploadUrl, publicUrl, key }
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "upload" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();

    // Profile image presign
    if (body.category === "avatar" || body.category === "cover") {
      const input = profilePresignSchema.parse(body);
      const result = await storageService.getPresignedProfileUploadUrl(
        session.user.id,
        input.category,
        input.contentType,
        input.fileSize
      );
      return Response.json(result);
    }

    // Beat file presign — producers only
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can upload beat files");
    }

    const input = presignSchema.parse(body);

    const targetProducerId = input.producerId ?? session.user.id;

    if (targetProducerId !== session.user.id && session.user.role !== "admin") {
      throw new ForbiddenError("You can only upload files for your own beats");
    }

    const result = await storageService.getPresignedUploadUrl(
      targetProducerId,
      input.beatId,
      input.category,
      input.contentType,
      input.fileSize
    );

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
