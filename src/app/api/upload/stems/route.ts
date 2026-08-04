import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/lib/auth";
import {
  formatErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors";
import { getStorageProvider, validateFile } from "@/lib/storage/config";
import { storageService } from "@/lib/services/storage.service";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * POST /api/upload/stems
 *
 * Accepts multipart form data with a single "file" field plus
 * "producerId" and "beatId" text fields.
 *
 * - Cloudinary: Uses Node SDK upload_stream (chunked) to bypass
 *   the 10 MB client-side REST API limit for raw files on free plan.
 * - S3/R2: Uses direct PutObject (no size limit per se).
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can upload files");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const producerId = formData.get("producerId") as string;
    const beatId = formData.get("beatId") as string;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }
    if (!producerId || !beatId) {
      return Response.json(
        { error: "producerId and beatId are required" },
        { status: 400 }
      );
    }

    if (producerId !== session.user.id && session.user.role !== "admin") {
      throw new ForbiddenError("You can only upload files for your own beats");
    }

    const validation = validateFile(
      { size: file.size, type: file.type || "application/zip" },
      "stems"
    );
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const provider = getStorageProvider();

    if (provider === "s3" || provider === "r2") {
      const result = await storageService.uploadBeatFile(
        file, producerId, beatId, "stems"
      );
      return Response.json(result);
    }

    // Cloudinary — use Node SDK upload_stream to bypass 10 MB REST API limit
    const buffer = Buffer.from(await file.arrayBuffer());
    const publicId = `producers/${producerId}/beats/${beatId}/stems`;
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "raw",
            public_id: publicId,
            type: "authenticated",
            overwrite: true,
            chunk_size: 6 * 1024 * 1024,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result as { secure_url: string; public_id: string });
          }
        );
        stream.end(buffer);
      }
    );

    return Response.json({
      url: result.secure_url,
      key: `${publicId}.zip`,
      publicId: result.public_id,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
