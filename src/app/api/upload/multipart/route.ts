import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  formatErrorResponse,
  ForbiddenError,
  UnauthorizedError,
} from "@/lib/errors";
import { buildBeatKey, validateFile } from "@/lib/storage/config";
import {
  createMultipartUpload,
  getPartPresignedUrls,
  completeMultipartUpload,
  abortMultipartUpload,
  MULTIPART_PART_SIZE,
} from "@/lib/storage/s3";

const initiateSchema = z.object({
  producerId: z.string().min(1).optional(),
  beatId: z.string().min(1),
  category: z.enum(["preview", "master", "stems", "artwork"]),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

const completeSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(
    z.object({
      partNumber: z.number().int().positive(),
      etag: z.string().min(1),
    })
  ),
});

const abortSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});

/**
 * POST /api/upload/multipart — Initiate multipart upload
 *
 * Returns { uploadId, key, publicUrl, partUrls[], partSize }
 */
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can upload files");
    }

    const body = await request.json();
    const input = initiateSchema.parse(body);

    const targetProducerId = input.producerId ?? session.user.id;

    if (targetProducerId !== session.user.id && session.user.role !== "admin") {
      throw new ForbiddenError("You can only upload files for your own beats");
    }

    const validation = validateFile(
      { size: input.fileSize, type: input.contentType },
      input.category
    );
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const key = buildBeatKey(
      targetProducerId,
      input.beatId,
      input.category,
      input.contentType
    );

    const totalParts = Math.ceil(input.fileSize / MULTIPART_PART_SIZE);
    const { uploadId, publicUrl } = await createMultipartUpload(
      key,
      input.contentType
    );
    const partUrls = await getPartPresignedUrls(key, uploadId, totalParts);

    return Response.json({
      uploadId,
      key,
      publicUrl,
      partUrls,
      partSize: MULTIPART_PART_SIZE,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

/**
 * PUT /api/upload/multipart — Complete multipart upload
 *
 * Body: { key, uploadId, parts: [{ partNumber, etag }] }
 */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const input = completeSchema.parse(body);

    const url = await completeMultipartUpload(
      input.key,
      input.uploadId,
      input.parts
    );

    return Response.json({ url, key: input.key });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

/**
 * DELETE /api/upload/multipart — Abort multipart upload
 *
 * Body: { key, uploadId }
 */
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const input = abortSchema.parse(body);

    await abortMultipartUpload(input.key, input.uploadId);

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
