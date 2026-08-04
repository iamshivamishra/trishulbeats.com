export type StorageProvider = "r2" | "cloudinary" | "s3";

export function getStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER?.toLowerCase();
  if (provider === "cloudinary") return "cloudinary";
  if (provider === "s3") return "s3";
  return "r2";
}

export const FILE_LIMITS = {
  preview: {
    maxSize: 50 * 1024 * 1024, // 50 MB (pehle 20 MB tha)
    allowedTypes: ["audio/mpeg", "audio/mp3", "application/zip", "application/x-zip-compressed"],
    label: "Preview MP3",
    ext: ".mp3",
  },
  master: {
    maxSize: 500 * 1024 * 1024, // 500 MB (pehle 100 MB tha)
    allowedTypes: ["audio/wav", "audio/x-wav", "application/zip", "application/x-zip-compressed"],
    label: "Master WAV",
    ext: ".wav",
  },
  stems: {
    maxSize: 5 * 1024 * 1024 * 1024, // 5 GB (pehle 500 MB tha)
    allowedTypes: ["application/zip", "application/x-zip-compressed"],
    label: "Stems ZIP",
    ext: ".zip",
  },
  artwork: {
    maxSize: 5 * 1024 * 1024, // 5 MB — same
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Artwork",
    ext: ".jpg",
  },
  avatar: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Avatar",
    ext: ".jpg",
  },
  cover: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Cover Image",
    ext: ".jpg",
  },
} as const;

export type FileCategory = keyof typeof FILE_LIMITS;

/**
 * Build the canonical storage key.
 *
 * Beat files:   producers/{producerId}/beats/{beatId}/preview.mp3
 * Profile:      producers/{producerId}/profile/avatar.jpg
 */

export function buildBeatKey(
  producerId: string,
  beatId: string,
  category: "preview" | "master" | "stems" | "artwork",
  contentType?: string // naya optional param - actual file type
): string {
  // Agar ZIP upload hui hai preview/master ke liye, to .zip extension use karo
  const isZip = contentType === "application/zip" || contentType === "application/x-zip-compressed";

  const exts: Record<string, string> = {
    preview: isZip ? "zip" : "mp3",
    master: isZip ? "zip" : "wav",
    stems: "zip",
    artwork: "jpg",
  };
  return `producers/${producerId}/beats/${beatId}/${category}.${exts[category]}`;
}


export function buildProfileKey(
  producerId: string,
  category: "avatar" | "cover"
): string {
  const timestamp = Date.now();
  return `producers/${producerId}/profile/${category}-${timestamp}.jpg`;
}

export function validateFile(
  file: { size: number; type: string },
  category: FileCategory
): { valid: true } | { valid: false; error: string } {
  const limits = FILE_LIMITS[category];

  if (!(limits.allowedTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type for ${limits.label}. Allowed: ${limits.allowedTypes.join(", ")}`,
    };
  }

  if (file.size > limits.maxSize) {
    const maxMB = Math.round(limits.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `${limits.label} must be under ${maxMB} MB`,
    };
  }

  return { valid: true };
}
