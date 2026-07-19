import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { logger } from "@/lib/logger";

type CloudinaryResourceType = "image" | "video" | "raw";
type CloudinaryDeliveryType = "upload" | "authenticated";

let _configured = false;

function ensureConfigured() {
  if (_configured) return;
  if (!process.env.CLOUDINARY_URL) {
    throw new Error("CLOUDINARY_URL not set");
  }
  cloudinary.config({ secure: true });
  _configured = true;
}

function inferResourceType(contentTypeOrExtension: string): CloudinaryResourceType {
  if (
    contentTypeOrExtension.startsWith("audio/") ||
    contentTypeOrExtension.startsWith("video/") ||
    [".mp3", ".wav", ".m4a"].includes(contentTypeOrExtension.toLowerCase())
  ) {
    return "video";
  }
  if (
    contentTypeOrExtension.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(contentTypeOrExtension.toLowerCase())
  ) {
    return "image";
  }
  return "raw";
}

function keyToPublicId(key: string): string {
  return key.replace(/\.[^.]+$/, "");
}

function extensionFromKey(key: string): string {
  const match = key.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? "";
}

function inferResourceTypeFromKey(key: string): CloudinaryResourceType {
  return inferResourceType(`.${extensionFromKey(key)}`);
}

export interface CloudinaryPresignedUploadResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  fields: Record<string, string>;
}

function deliveryTypeForCategory(
  category: "preview" | "master" | "stems" | "artwork" | "avatar" | "cover"
): CloudinaryDeliveryType {
  if (category === "master" || category === "stems") return "authenticated";
  return "upload";
}

function deliveryTypeForKey(key: string): CloudinaryDeliveryType {
  if (key.includes("/master.") || key.includes("/stems.")) {
    return "authenticated";
  }
  return "upload";
}

function allowedFormatsForCategory(
  category: "preview" | "master" | "stems" | "artwork" | "avatar" | "cover"
): string {
  switch (category) {
    case "preview":
      return "mp3";
    case "master":
      return "wav";
    case "stems":
      return "zip";
    case "artwork":
    case "avatar":
    case "cover":
      return "jpg,jpeg,png,webp";
  }
}

export async function createCloudinaryPresignedUpload(
  key: string,
  contentType: string,
  category: "preview" | "master" | "stems" | "artwork" | "avatar" | "cover",
  maxFileSizeBytes: number
): Promise<CloudinaryPresignedUploadResult> {
  ensureConfigured();

  const config = cloudinary.config();
  const cloudName = config.cloud_name;
  const apiKey = config.api_key;
  const apiSecret = config.api_secret;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Cloudinary credentials are incomplete");
  }

  const publicId = keyToPublicId(key);
  const resourceType = inferResourceType(contentType);
  const deliveryType = deliveryTypeForCategory(category);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedParams = {
    public_id: publicId,
    timestamp,
    type: deliveryType,
    allowed_formats: allowedFormatsForCategory(category),
    max_file_size: String(maxFileSizeBytes),
    overwrite: "true",
  };
  const signature = cloudinary.utils.api_sign_request(signedParams, apiSecret);

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;
  const publicUrl = cloudinary.url(publicId, {
    resource_type: resourceType,
    type: deliveryType,
    secure: true,
  });

  return {
    uploadUrl,
    publicUrl,
    key,
    fields: {
      api_key: String(apiKey),
      timestamp: String(timestamp),
      signature,
      public_id: publicId,
      type: deliveryType,
      allowed_formats: allowedFormatsForCategory(category),
      max_file_size: String(maxFileSizeBytes),
      overwrite: "true",
    },
  };
}

export async function uploadToCloudinary(
  buffer: Buffer,
  key: string,
  resourceType: CloudinaryResourceType = "raw",
  deliveryType?: CloudinaryDeliveryType
): Promise<string> {
  ensureConfigured();

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: keyToPublicId(key),
        resource_type: resourceType,
        type: deliveryType ?? deliveryTypeForKey(key),
        folder: "",
        overwrite: true,
      },
      (error, result?: UploadApiResponse) => {
        if (error) {
          logger.error("Cloudinary upload failed", { key, error: error.message });
          return reject(error);
        }
        resolve(result!.secure_url);
      }
    );

    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(
  key: string,
  resourceType?: CloudinaryResourceType
): Promise<void> {
  ensureConfigured();
  const resolvedType = resourceType ?? inferResourceTypeFromKey(key);
  await cloudinary.uploader.destroy(keyToPublicId(key), { resource_type: resolvedType });
  logger.info("Deleted from Cloudinary", { key });
}

export function getCloudinaryUrl(key: string): string {
  ensureConfigured();
  const publicId = keyToPublicId(key);
  return cloudinary.url(publicId, {
    resource_type: inferResourceTypeFromKey(key),
    type: deliveryTypeForKey(key),
    secure: true,
  });
}

export function getCloudinarySignedDownloadUrl(
  key: string,
  expiresInSeconds = 900
): string {
  ensureConfigured();
  const publicId = keyToPublicId(key);
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const format = extensionFromKey(key);

  return cloudinary.utils.private_download_url(publicId, format, {
    resource_type: inferResourceTypeFromKey(key),
    type: deliveryTypeForKey(key),
    expires_at: expiresAt,
  });
}
