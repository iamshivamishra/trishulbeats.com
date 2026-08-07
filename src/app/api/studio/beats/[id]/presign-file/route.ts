import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

const VALID_FILE_TYPES = ["preview", "master", "stems"] as const;
type FileType = (typeof VALID_FILE_TYPES)[number];

/**
 * GET /api/studio/beats/[id]/presign-file?type=stems
 *
 * Allows producers to get a presigned download URL for their own beat files.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access this endpoint");
    }

    const { id } = await params;
    const typeParam = request.nextUrl.searchParams.get("type") as FileType;
    if (!typeParam || !VALID_FILE_TYPES.includes(typeParam)) {
      throw new ValidationError("Invalid file type", { type: [`Must be one of: ${VALID_FILE_TYPES.join(", ")}`] });
    }

    const beat = await beatRepository.findById(id, true);
    if (!beat) throw new NotFoundError("Beat");

    if (beat.producerId.toString() !== session.user.id && session.user.role !== "admin") {
      throw new ForbiddenError("You can only download your own beats");
    }

    const keys = beat.storageKeys;
    let key: string | undefined;

    if (typeParam === "stems" && keys?.stems) {
      key = keys.stems;
    } else if (typeParam === "master" && keys?.master) {
      key = keys.master;
    } else if (typeParam === "preview" && keys?.preview) {
      key = keys.preview;
    }

    if (!key) {
      const urlField = typeParam === "preview" ? beat.audioTaggedUrl
        : typeParam === "master" ? beat.audioFullUrl
        : beat.stemsUrl;
      if (!urlField) throw new NotFoundError(`${typeParam} file not found for this beat`);
      const presigned = await storageService.presignUrl(urlField, 3600);
      return Response.json({ url: presigned });
    }

    const url = await storageService.getDownloadUrl(key, { expiresInSeconds: 3600 });
    return Response.json({ url });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
