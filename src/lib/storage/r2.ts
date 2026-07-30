import { v2 as cloudinary } from "cloudinary";
import { logger } from "@/lib/logger";

let _configured = false;

function getClient() {
  if (_configured) return cloudinary;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary credentials not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  _configured = true;
  return cloudinary;
}

/**
 * Cloudinary treats audio/video files under resource_type "video".
 * Images/PDFs etc use "image" or "raw". We pick based on contentType.
 */
function resourceTypeFor(contentType: string): "image" | "video" | "raw" {
  if (contentType.startsWith("audio/") || contentType.startsWith("video/")) {
    return "video";
  }
  if (contentType.startsWith("image/")) {
    return "image";
  }
  // ZIP/archive files (stems) use "video" — Cloudinary's "raw" endpoint
  // has limited CORS support for browser-side uploads
  if (contentType === "application/zip" || contentType === "application/x-zip-compressed") {
    return "video";
  }
  return "raw";
}

/**
 * Generate a signed upload payload so the client can upload directly to Cloudinary.
 * (Equivalent to a presigned PUT URL for R2.) The client must POST to
 * https://api.cloudinary.com/v1_1/<cloud_name>/<resource_type>/upload
 * with these fields (multipart/form-data), plus the file itself.
 */
export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  _maxSizeBytes: number,
  expiresIn = 600
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const client = getClient();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const resourceType = resourceTypeFor(contentType);
  const timestamp = Math.floor(Date.now() / 1000);

  const paramsToSign = {
    public_id: key,
    timestamp,
  };

  const signature = client.utils.api_sign_request(
    paramsToSign,
    process.env.CLOUDINARY_API_SECRET!
  );

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload?api_key=${process.env.CLOUDINARY_API_KEY}&timestamp=${timestamp}&signature=${signature}&public_id=${encodeURIComponent(
    key
  )}`;

  const publicUrl = client.url(key, {
    resource_type: resourceType,
    secure: true,
  });

  logger.info("Cloudinary presigned upload created", {
    key,
    contentType,
    expiresIn,
  });

  return { uploadUrl, publicUrl, key };
}

/**
 * Server-side upload: push a buffer directly to Cloudinary.
 */
export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = getClient();
  const resourceType = resourceTypeFor(contentType);

  logger.info("Uploading to Cloudinary", {
    key,
    contentType,
    size: buffer.length,
  });

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = client.uploader.upload_stream(
      {
        public_id: key,
        resource_type: resourceType,
        overwrite: true,
      },
      (error, uploadResult) => {
        if (error || !uploadResult) {
          return reject(error || new Error("Cloudinary upload failed"));
        }
        resolve(uploadResult as { secure_url: string });
      }
    );
    stream.end(buffer);
  });

  return result.secure_url;
}

export async function deleteFromR2(key: string, contentType?: string): Promise<void> {
  const client = getClient();
  const resourceType = contentType ? resourceTypeFor(contentType) : "video";

  logger.info("Deleting from Cloudinary", { key });

  await client.uploader.destroy(key, { resource_type: resourceType });
}

/**
 * Cloudinary doesn't use presigned GET URLs the same way S3/R2 does.
 * For "private"/authenticated assets you'd upload with type: "authenticated"
 * and sign a delivery URL. For now this returns a standard signed delivery URL.
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn = 3600,
  contentType?: string
): Promise<string> {
  const client = getClient();
  const resourceType = contentType ? resourceTypeFor(contentType) : "video";
  const timestamp = Math.floor(Date.now() / 1000) + expiresIn;

  return client.utils.private_download_url(key, "", {
    resource_type: resourceType,
    expires_at: timestamp,
  });
}

export function getPublicUrl(key: string, contentType?: string): string {
  const client = getClient();
  const resourceType = contentType ? resourceTypeFor(contentType) : "video";
  return client.url(key, {
    resource_type: resourceType,
    secure: true,
  });
}