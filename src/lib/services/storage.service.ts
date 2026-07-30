import {
  getStorageProvider,
  validateFile,
  buildBeatKey,
  buildProfileKey,
  FILE_LIMITS,
  type FileCategory,
} from "@/lib/storage/config";
import {
  uploadToR2,
  deleteFromR2,
  getSignedDownloadUrl as r2DownloadUrl,
  getPublicUrl as r2PublicUrl,
  createPresignedUploadUrl,
} from "@/lib/storage/r2";
import {
  createCloudinaryPresignedUpload,
  uploadToCloudinary,
  deleteFromCloudinary,
  getCloudinarySignedDownloadUrl,
  getCloudinaryUrl,
} from "@/lib/storage/cloudinary";
import { logger } from "@/lib/logger";

function resourceTypeForCategory(
  category: FileCategory
): "image" | "video" | "raw" {
  if (["artwork", "avatar", "cover"].includes(category)) return "image";
  // stems (ZIP) also uses "video" — Cloudinary's "raw" endpoint has limited
  // CORS support for browser-side uploads
  if (["preview", "master", "stems"].includes(category)) return "video";
  return "raw";
}

export const storageService = {
  SIGNED_URL_TTL_SECONDS: 900,

  // ─── Presigned (client-side) uploads ────────────────────────────

  /**
   * Returns a presigned PUT URL for the client to upload directly to R2.
   * Only available when provider = r2.
   */
  async getPresignedUploadUrl(
    producerId: string,
    beatId: string,
    category: "preview" | "master" | "stems" | "artwork",
    contentType: string,
    fileSize: number
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    fields?: Record<string, string>;
  }> {
    const validation = validateFile({ size: fileSize, type: contentType }, category);
    if (!validation.valid) throw new Error(validation.error);

    const key = buildBeatKey(producerId, beatId, category, contentType);
    const provider = getStorageProvider();
    if (provider === "cloudinary") {
      return createCloudinaryPresignedUpload(key, contentType, category, fileSize);
    }
    return createPresignedUploadUrl(key, contentType, fileSize);
  },

  /**
   * Presigned URL for profile image uploads.
   */
  async getPresignedProfileUploadUrl(
    producerId: string,
    category: "avatar" | "cover",
    contentType: string,
    fileSize: number
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    fields?: Record<string, string>;
  }> {
    const validation = validateFile({ size: fileSize, type: contentType }, category);
    if (!validation.valid) throw new Error(validation.error);

    const key = buildProfileKey(producerId, category);
    const provider = getStorageProvider();
    if (provider === "cloudinary") {
      return createCloudinaryPresignedUpload(key, contentType, category, fileSize);
    }
    return createPresignedUploadUrl(key, contentType, fileSize);
  },

  // ─── Server-side uploads ────────────────────────────────────────

  /**
   * Upload a beat file from the server. Works with both R2 and Cloudinary.
   */
  async uploadBeatFile(
    file: File,
    producerId: string,
    beatId: string,
    category: "preview" | "master" | "stems" | "artwork"
  ): Promise<{ url: string; key: string }> {
    const validation = validateFile(file, category);
    if (!validation.valid) throw new Error(validation.error);

    const key = buildBeatKey(producerId, beatId, category);
    const buffer = Buffer.from(await file.arrayBuffer());
    const provider = getStorageProvider();

    let url: string;
    if (provider === "cloudinary") {
      url = await uploadToCloudinary(buffer, key, resourceTypeForCategory(category));
    } else {
      url = await uploadToR2(buffer, key, file.type);
    }

    logger.info("Beat file uploaded", { provider, category, key, size: file.size });
    return { url, key };
  },

  /**
   * Upload a profile image (avatar or cover) from the server.
   */
  async uploadProfileImage(
    file: File,
    producerId: string,
    category: "avatar" | "cover"
  ): Promise<{ url: string; key: string }> {
    const validation = validateFile(file, category);
    if (!validation.valid) throw new Error(validation.error);

    const key = buildProfileKey(producerId, category);
    const buffer = Buffer.from(await file.arrayBuffer());
    const provider = getStorageProvider();

    let url: string;
    if (provider === "cloudinary") {
      url = await uploadToCloudinary(buffer, key, "image");
    } else {
      url = await uploadToR2(buffer, key, file.type);
    }

    logger.info("Profile image uploaded", { provider, category, key, size: file.size });
    return { url, key };
  },

  // ─── Legacy server-side helpers (kept for backward compat) ──────

  async uploadBeatAudio(
    file: File,
    variant: "tagged" | "full",
    producerId?: string,
    beatId?: string
  ): Promise<{ url: string; key: string }> {
    const category = variant === "tagged" ? "preview" : "master";

    if (producerId && beatId) {
      return this.uploadBeatFile(file, producerId, beatId, category);
    }

    const validation = validateFile(file, category);
    if (!validation.valid) throw new Error(validation.error);

    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();
    const key = `beats/${variant}/${ts}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const provider = getStorageProvider();

    let url: string;
    if (provider === "cloudinary") {
      url = await uploadToCloudinary(buffer, key, resourceTypeForCategory(category));
    } else {
      url = await uploadToR2(buffer, key, file.type);
    }

    logger.info("Beat audio uploaded (legacy)", {
      provider,
      key,
      variant,
      size: file.size,
    });
    return { url, key };
  },

  async uploadCoverImage(file: File, folder = "covers"): Promise<{ url: string; key: string }> {
    const validation = validateFile(file, "artwork");
    if (!validation.valid) throw new Error(validation.error);

    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();
    const key = `${folder}/${ts}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const provider = getStorageProvider();

    let url: string;
    if (provider === "cloudinary") {
      url = await uploadToCloudinary(buffer, key, "image");
    } else {
      url = await uploadToR2(buffer, key, file.type);
    }

    logger.info("Cover image uploaded", { provider, key, folder, size: file.size });
    return { url, key };
  },

  async uploadAvatar(file: File): Promise<{ url: string; key: string }> {
    const validation = validateFile(file, "avatar");
    if (!validation.valid) throw new Error(validation.error);

    const buffer = Buffer.from(await file.arrayBuffer());
    const ts = Date.now();
    const key = `avatars/${ts}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const provider = getStorageProvider();

    const url =
      provider === "cloudinary"
        ? await uploadToCloudinary(buffer, key, "image")
        : await uploadToR2(buffer, key, file.type);

    logger.info("Avatar uploaded", { provider, key, size: file.size });
    return { url, key };
  },

  // ─── Delete / download ─────────────────────────────────────────

  async deleteFile(key: string): Promise<void> {
    const provider = getStorageProvider();
    if (provider === "cloudinary") {
      await deleteFromCloudinary(key);
    } else {
      await deleteFromR2(key);
    }
  },

  async getDownloadUrl(
    key: string,
    options: { expiresInSeconds?: number } = {}
  ): Promise<string> {
    const expiresInSeconds = options.expiresInSeconds ?? this.SIGNED_URL_TTL_SECONDS;
    const provider = getStorageProvider();
    if (provider === "cloudinary") {
      return getCloudinarySignedDownloadUrl(key, expiresInSeconds);
    }
    return r2DownloadUrl(key, expiresInSeconds);
  },

  getPublicUrl(key: string): string {
    if (getStorageProvider() === "cloudinary") {
      return getCloudinaryUrl(key);
    }
    return r2PublicUrl(key);
  },

  /**
   * Return file limits for the client to validate before uploading.
   */
  getFileLimits() {
    return FILE_LIMITS;
  },
};
