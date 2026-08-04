import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { storageService } from "@/lib/services/storage.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { resolvePurchaseEntitlements } from "@/lib/security/entitlements";
import type { IBeat } from "@/types";

export type DownloadFileType = "preview" | "master" | "stems";

interface DownloadLink {
  type: DownloadFileType;
  label: string;
  url: string;
  filename: string;
  available: boolean;
  reason?: string;
}

interface DownloadAccess {
  beatId: string;
  beatTitle: string;
  coverUrl?: string;
  licenseType: string;
  licenseName: string;
  expiresInSeconds: number;
  links: DownloadLink[];
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

function isStorageKey(value: string): boolean {
  return !value.startsWith("http://") && !value.startsWith("https://");
}

async function generateSignedUrl(beat: IBeat, fileType: DownloadFileType): Promise<string> {
  const storageKey = resolveStorageKey(beat, fileType);
  if (storageKey) {
    return storageService.getDownloadUrl(storageKey, {
      expiresInSeconds: storageService.SIGNED_URL_TTL_SECONDS,
    });
  }

  const url = resolveFileUrl(beat, fileType);
  if (!url) {
    throw new NotFoundError(`${fileType} file not available for this beat`);
  }

  if (isStorageKey(url)) {
    return storageService.getDownloadUrl(url, {
      expiresInSeconds: storageService.SIGNED_URL_TTL_SECONDS,
    });
  }

  const publicBases = [
    process.env.R2_PUBLIC_URL,
    process.env.AWS_S3_PUBLIC_URL,
  ].filter(Boolean).map((u) => u!.replace(/\/$/, ""));

  for (const publicBase of publicBases) {
    if (url.startsWith(publicBase)) {
      const key = url.slice(publicBase.length + 1);
      return storageService.getDownloadUrl(key, {
        expiresInSeconds: storageService.SIGNED_URL_TTL_SECONDS,
      });
    }
  }

  return url;
}

export const downloadService = {
  /**
   * Get all available download links for a purchased beat.
   * Validates ownership and checks license entitlements.
   */
  async getDownloadLinks(
    userId: string,
    beatId: string
  ): Promise<DownloadAccess> {
    const hasPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (!hasPurchased) {
      throw new ForbiddenError("You must purchase this beat to download it");
    }

    const beat = await beatRepository.findById(beatId, true);
    if (!beat) throw new NotFoundError("Beat");

    // Find the user's purchase to get the license
    const purchases = await purchaseRepository.findByBuyerAndBeat(userId, beatId);
    if (purchases.length === 0) throw new ForbiddenError("No purchase found");

    const purchase = purchases[0];
    const license = await licenseRepository.findById(purchase.licenseId.toString());
    const { wavAllowed, stemsAllowed, licenseMatchesBeat } = resolvePurchaseEntitlements(
      purchase,
      license,
      beatId
    );

    const links: DownloadLink[] = [];

    // MP3 — always included with any purchase
    const previewUrl = resolveFileUrl(beat, "preview");
    if (previewUrl) {
      const filename = buildFilename(beat.title, "preview");
      links.push({
        type: "preview",
        label: "MP3",
        url: await generateSignedUrl(beat, "preview"),
        filename,
        available: true,
      });
    }

    // WAV Master — requires license.includesWav
    const masterUrl = resolveFileUrl(beat, "master");
    if (masterUrl && wavAllowed) {
      const filename = buildFilename(beat.title, "master");
      links.push({
        type: "master",
        label: "WAV Master",
        url: await generateSignedUrl(beat, "master"),
        filename,
        available: true,
      });
    } else if (!wavAllowed) {
      links.push({
        type: "master",
        label: "WAV Master",
        url: "",
        filename: "",
        available: false,
        reason: "Upgrade your license to access WAV files",
      });
    }

    // Stems — requires license.includesStems
    const stemsUrl = resolveFileUrl(beat, "stems");
    if (stemsUrl && stemsAllowed) {
      const filename = buildFilename(beat.title, "stems");
      links.push({
        type: "stems",
        label: "Stems Package",
        url: await generateSignedUrl(beat, "stems"),
        filename,
        available: true,
      });
    } else if (stemsUrl && !stemsAllowed) {
      links.push({
        type: "stems",
        label: "Stems Package",
        url: "",
        filename: "",
        available: false,
        reason: "Upgrade to Unlimited license for stems access",
      });
    } else if (!stemsUrl) {
      links.push({
        type: "stems",
        label: "Stems Package",
        url: "",
        filename: "",
        available: false,
        reason: "Stems not provided for this beat",
      });
    }

    logger.info("Download links generated", {
      userId,
      beatId,
      wavAllowed,
      stemsAllowed,
      licenseMatchesBeat,
      linksCount: links.filter((l) => l.available).length,
    });
    audit({
      action: "download.links_generated",
      userId,
      resourceType: "beat",
      resourceId: beatId,
      metadata: { wavAllowed, stemsAllowed, licenseMatchesBeat },
    });

    return {
      beatId: beat._id.toString(),
      beatTitle: beat.title,
      coverUrl: beat.coverUrl,
      licenseType: purchase.licenseType,
      licenseName: licenseMatchesBeat ? (license?.name ?? purchase.licenseType) : purchase.licenseType,
      expiresInSeconds: storageService.SIGNED_URL_TTL_SECONDS,
      links,
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
