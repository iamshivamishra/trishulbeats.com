import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { storageService } from "@/lib/services/storage.service";
import { getCloudinarySignedDownloadUrl } from "@/lib/storage/cloudinary";
import { getSignedDownloadUrl as s3DownloadUrl } from "@/lib/storage/s3";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { resolvePurchaseEntitlements } from "@/lib/security/entitlements";
import type { IBeat } from "@/types";

export type DownloadFileType = "preview" | "master" | "stems";

export interface DownloadEntitlement {
  type: DownloadFileType;
  label: string;
  available: boolean;
  reason?: string;
}

export interface DownloadEntitlements {
  beatId: string;
  beatTitle: string;
  coverUrl?: string;
  licenseType: string;
  licenseName: string;
  files: DownloadEntitlement[];
}


function buildFilename(title: string, type: DownloadFileType): string {
  const sanitized = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  switch (type) {
    case "preview":
      return `${sanitized} - Preview.mp3`;
    case "master":
      return `${sanitized}.wav`;
    case "stems":
      return `${sanitized} - Stems.zip`;
  }
}

function resolveFileUrl(beat: IBeat, type: DownloadFileType): string | null {
  switch (type) {
    case "preview":
      return beat.audioTaggedUrl || null;
    case "master":
      return beat.audioFullUrl || null;
    case "stems":
      return beat.stemsUrl || null;
  }
}

function resolveStorageKey(beat: IBeat, type: DownloadFileType): string | null {
  const storageKeys = beat.storageKeys;
  switch (type) {
    case "preview":
      return storageKeys?.preview || null;
    case "master":
      return storageKeys?.master || null;
    case "stems":
      return storageKeys?.stems || null;
  }
}

/**
 * Detect the actual storage provider from a URL and sign accordingly.
 * Beats may have been uploaded to Cloudinary, S3, or R2 regardless of
 * the current STORAGE_PROVIDER setting.
 */
function detectProviderFromUrl(url: string): "cloudinary" | "s3" | "r2" | null {
  if (url.includes("res.cloudinary.com") || url.includes("api.cloudinary.com")) {
    return "cloudinary";
  }
  const s3Base = process.env.AWS_S3_PUBLIC_URL;
  if (s3Base && url.startsWith(s3Base.replace(/\/$/, ""))) return "s3";
  if (url.includes(".amazonaws.com")) return "s3";

  const r2Base = process.env.R2_PUBLIC_URL;
  if (r2Base && url.startsWith(r2Base.replace(/\/$/, ""))) return "r2";
  if (url.includes(".r2.dev")) return "r2";

  return null;
}

function extractKeyFromUrl(url: string): string | null {
  const bases = [
    process.env.AWS_S3_PUBLIC_URL,
    process.env.R2_PUBLIC_URL,
  ].filter(Boolean).map((u) => u!.replace(/\/$/, ""));

  for (const base of bases) {
    if (url.startsWith(base)) {
      return url.slice(base.length + 1);
    }
  }
  return null;
}

async function generateSignedUrl(beat: IBeat, fileType: DownloadFileType): Promise<string> {
  const ttl = storageService.SIGNED_URL_TTL_SECONDS;
  const url = resolveFileUrl(beat, fileType);
  const storageKey = resolveStorageKey(beat, fileType);

  // If we have a URL, detect where the file actually lives
  if (url) {
    const provider = detectProviderFromUrl(url);

    if (provider === "cloudinary") {
      // Cloudinary URLs: extract the public_id path and sign via Cloudinary
      const key = storageKey || url;
      return getCloudinarySignedDownloadUrl(key, ttl);
    }

    if (provider === "s3") {
      const key = storageKey || extractKeyFromUrl(url);
      if (key) return s3DownloadUrl(key, ttl);
    }

    if (provider === "r2") {
      const key = storageKey || extractKeyFromUrl(url);
      if (key) {
        const { getSignedDownloadUrl: r2Download } = await import("@/lib/storage/r2");
        return r2Download(key, ttl);
      }
    }
  }

  // Fallback: use storageKey with the current provider
  if (storageKey) {
    return storageService.getDownloadUrl(storageKey, { expiresInSeconds: ttl });
  }

  // No signing needed or possible — return raw URL
  if (url) return url;

  throw new NotFoundError(`${fileType} file not available for this beat`);
}

export const downloadService = {
  /**
   * Get download entitlements for a purchased beat.
   * Returns what files are available/locked — NO signed URLs.
   * Signed URLs are generated on-demand via getSignedUrl().
   */
  async getEntitlements(
    userId: string,
    beatId: string
  ): Promise<DownloadEntitlements> {
    const hasPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (!hasPurchased) {
      throw new ForbiddenError("You must purchase this beat to download it");
    }

    const beat = await beatRepository.findById(beatId, true);
    if (!beat) throw new NotFoundError("Beat");

    const purchases = await purchaseRepository.findByBuyerAndBeat(userId, beatId);
    if (purchases.length === 0) throw new ForbiddenError("No purchase found");

    const purchase = purchases[0];
    const license = await licenseRepository.findById(purchase.licenseId.toString());
    const { wavAllowed, stemsAllowed, licenseMatchesBeat } = resolvePurchaseEntitlements(
      purchase,
      license,
      beatId
    );

    const files: DownloadEntitlement[] = [];

    const previewUrl = resolveFileUrl(beat, "preview");
    if (previewUrl) {
      files.push({ type: "preview", label: "MP3", available: true });
    }

    const masterUrl = resolveFileUrl(beat, "master");
    if (masterUrl && wavAllowed) {
      files.push({ type: "master", label: "WAV Master", available: true });
    } else if (!wavAllowed) {
      files.push({
        type: "master",
        label: "WAV Master",
        available: false,
        reason: "Upgrade your license to access WAV files",
      });
    }

    const stemsUrl = resolveFileUrl(beat, "stems");
    if (stemsUrl && stemsAllowed) {
      files.push({ type: "stems", label: "Stems Package", available: true });
    } else if (stemsUrl && !stemsAllowed) {
      files.push({
        type: "stems",
        label: "Stems Package",
        available: false,
        reason: "Upgrade to Unlimited license for stems access",
      });
    } else if (!stemsUrl) {
      files.push({
        type: "stems",
        label: "Stems Package",
        available: false,
        reason: "Stems not provided for this beat",
      });
    }

    logger.info("Download entitlements checked", {
      userId, beatId, wavAllowed, stemsAllowed, licenseMatchesBeat,
    });

    return {
      beatId: beat._id.toString(),
      beatTitle: beat.title,
      coverUrl: beat.coverUrl,
      licenseType: purchase.licenseType,
      licenseName: licenseMatchesBeat ? (license?.name ?? purchase.licenseType) : purchase.licenseType,
      files,
    };
  },

  /**
   * Generate a single signed download URL.
   * Used for direct download redirects.
   */
  async getSignedUrl(
    userId: string,
    beatId: string,
    fileType: DownloadFileType
  ): Promise<{ url: string; filename: string }> {
    const hasPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (!hasPurchased) {
      throw new ForbiddenError("You must purchase this beat to download it");
    }

    const beat = await beatRepository.findById(beatId, true);
    if (!beat) throw new NotFoundError("Beat");

    // Check license entitlements
    const purchases = await purchaseRepository.findByBuyerAndBeat(userId, beatId);
    if (purchases.length === 0) throw new ForbiddenError("No purchase found");

    const purchase = purchases[0];
    const license = await licenseRepository.findById(purchase.licenseId.toString());
    const { wavAllowed, stemsAllowed } = resolvePurchaseEntitlements(
      purchase,
      license,
      beatId
    );

    if (fileType === "master" && !wavAllowed) {
      throw new ForbiddenError("Your license does not include WAV files. Upgrade to access.");
    }

    if (fileType === "stems" && !stemsAllowed) {
      throw new ForbiddenError("Your license does not include stems. Upgrade to Unlimited.");
    }

    const fileUrl = resolveFileUrl(beat, fileType);
    if (!fileUrl) throw new NotFoundError(`${fileType} file not available for this beat`);

    const filename = buildFilename(beat.title, fileType);
    const url = await generateSignedUrl(beat, fileType);

    logger.info("Signed download URL generated", { userId, beatId, fileType });
    audit({
      action: "download.signed_url",
      userId,
      resourceType: "beat",
      resourceId: beatId,
      metadata: { fileType },
    });

    return { url, filename };
  },
};
