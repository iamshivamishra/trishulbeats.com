import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (_client) return _client;

  const region = process.env.AWS_S3_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS S3 credentials are not configured. Set AWS_S3_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY."
    );
  }

  _client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

function getBucket(): string {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error("AWS_S3_BUCKET is not set");
  return bucket;
}

/**
 * Base public URL for the bucket — either a CloudFront distribution
 * or the default S3 URL.
 */
function getBaseUrl(): string {
  if (process.env.AWS_S3_PUBLIC_URL) {
    return process.env.AWS_S3_PUBLIC_URL.replace(/\/$/, "");
  }
  return `https://${getBucket()}.s3.${process.env.AWS_S3_REGION}.amazonaws.com`;
}

// ─── Presigned upload (client-side PUT) ──────────────────────────

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  _maxSizeBytes: number,
  expiresIn = 600
): Promise<{
  uploadUrl: string;
  publicUrl: string;
  key: string;
}> {
  const command = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn });
  const publicUrl = `${getBaseUrl()}/${key}`;

  return { uploadUrl, publicUrl, key };
}

// ─── Server-side upload ──────────────────────────────────────────

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string,
  options?: { contentDisposition?: string }
): Promise<string> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ...(options?.contentDisposition && {
        ContentDisposition: options.contentDisposition,
      }),
    })
  );

  const url = `${getBaseUrl()}/${key}`;
  logger.info("Uploaded to S3", { key, size: buffer.length });
  return url;
}

// ─── Delete ──────────────────────────────────────────────────────

export async function deleteFromS3(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
  logger.info("Deleted from S3", { key });
}

// ─── Signed download URL ─────────────────────────────────────────

export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });

  return getSignedUrl(getClient(), command, { expiresIn });
}

// ─── Public URL ──────────────────────────────────────────────────

export function getPublicUrl(key: string): string {
  return `${getBaseUrl()}/${key}`;
}

// ─── Multipart upload ────────────────────────────────────────────

export const MULTIPART_PART_SIZE = 10 * 1024 * 1024; // 10 MB per part

export async function createMultipartUpload(
  key: string,
  contentType: string
): Promise<{ uploadId: string; key: string; publicUrl: string }> {
  const result = await getClient().send(
    new CreateMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      ContentType: contentType,
    })
  );

  if (!result.UploadId) throw new Error("Failed to initiate multipart upload");

  logger.info("Multipart upload initiated", { key, uploadId: result.UploadId });
  return {
    uploadId: result.UploadId,
    key,
    publicUrl: `${getBaseUrl()}/${key}`,
  };
}

export async function getPartPresignedUrls(
  key: string,
  uploadId: string,
  totalParts: number,
  expiresIn = 3600
): Promise<string[]> {
  const urls: string[] = [];
  for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
    const command = new UploadPartCommand({
      Bucket: getBucket(),
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    const url = await getSignedUrl(getClient(), command, { expiresIn });
    urls.push(url);
  }
  return urls;
}

export async function completeMultipartUpload(
  key: string,
  uploadId: string,
  parts: { partNumber: number; etag: string }[]
): Promise<string> {
  await getClient().send(
    new CompleteMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({
          PartNumber: p.partNumber,
          ETag: p.etag,
        })),
      },
    })
  );

  const url = `${getBaseUrl()}/${key}`;
  logger.info("Multipart upload completed", { key, uploadId, parts: parts.length });
  return url;
}

export async function abortMultipartUpload(
  key: string,
  uploadId: string
): Promise<void> {
  await getClient().send(
    new AbortMultipartUploadCommand({
      Bucket: getBucket(),
      Key: key,
      UploadId: uploadId,
    })
  );
  logger.info("Multipart upload aborted", { key, uploadId });
}
