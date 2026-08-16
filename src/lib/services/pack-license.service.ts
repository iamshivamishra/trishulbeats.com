import { packLicenseRepository } from "@/lib/repositories/pack-license.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { storageService } from "@/lib/services/storage.service";
import { generatePackLicensePdf } from "@/lib/pdf/pack-license-pdf";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import crypto from "crypto";
import { computeLicenseHash } from "@/lib/license-hash";
import type { IPackLicenseCertificate, LicenseType } from "@/types";

function generateLicenseNumber(): string {
  const year = new Date().getFullYear();
  const uuid = crypto.randomUUID().replace(/-/g, "").substring(0, 12).toUpperCase();
  return `TB-LIC-${year}-${uuid}`;
}

function buildStorageKey(
  buyerId: string,
  packId: string,
  licenseNumber: string
): string {
  return `licenses/${buyerId}/${packId}/${licenseNumber}.pdf`;
}

export const packLicenseService = {
  /**
   * Issue license certificate(s) for a paid order.
   * Idempotent: skips if a certificate already exists for this orderId.
   * Handles both new pack purchases and upgrades.
   */
  async issueForOrder(orderId: string): Promise<void> {
    const order = await orderRepository.findById(orderId);
    if (!order || order.status !== "paid") return;

    const existing = await packLicenseRepository.findByOrderId(orderId);
    if (existing) return;

    // Group items by sourcePackId — one cert per pack
    const packItemsMap = new Map<
      string,
      { tier: LicenseType; sourceType: string; beatTitles: string[]; totalAmount: number }
    >();

    for (const item of order.items) {
      if (
        (item.sourceType === "pack" || item.sourceType === "upgrade") &&
        item.sourcePackId
      ) {
        const packId = item.sourcePackId.toString();
        const entry = packItemsMap.get(packId);
        if (entry) {
          entry.beatTitles.push(item.beatTitle);
          entry.totalAmount += item.price;
        } else {
          packItemsMap.set(packId, {
            tier: item.licenseType,
            sourceType: item.sourceType,
            beatTitles: [item.beatTitle],
            totalAmount: item.price,
          });
        }
      }
    }

    if (packItemsMap.size === 0) return;

    const buyerId = order.buyerId.toString();
    const buyer = await userRepository.findById(buyerId);
    const buyerName = buyer?.displayName || buyer?.name || "Customer";
    const buyerEmail = buyer?.email || "";

    for (const [packId, packInfo] of packItemsMap) {
      try {
        await this.issueSingleCert({
          buyerId,
          packId,
          orderId,
          tier: packInfo.tier,
          sourceType: packInfo.sourceType,
          beatTitles: packInfo.beatTitles,
          totalAmount: packInfo.totalAmount,
          buyerName,
          buyerEmail,
          paidAt: order.paidAt ?? order.createdAt,
          receiptNumber: order.receipt,
        });
      } catch (err) {
        logger.error("Failed to issue license certificate for pack", {
          orderId,
          packId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  },

  async issueSingleCert(params: {
    buyerId: string;
    packId: string;
    orderId: string;
    tier: LicenseType;
    sourceType: string;
    beatTitles: string[];
    totalAmount: number;
    buyerName: string;
    buyerEmail: string;
    paidAt: Date;
    receiptNumber: string;
  }): Promise<IPackLicenseCertificate> {
    const {
      buyerId, packId, orderId, tier, sourceType,
      beatTitles, totalAmount, buyerName, buyerEmail,
      paidAt, receiptNumber,
    } = params;

    const isUpgrade = sourceType === "upgrade";
    const licenseNumber = generateLicenseNumber();
    const now = new Date();

    // For upgrade: load previous cert to carry forward effectiveAt
    let previousCert: IPackLicenseCertificate | null = null;
    if (isUpgrade) {
      previousCert = await packLicenseRepository.findActive(buyerId, packId);
    }

    const effectiveAt = previousCert?.effectiveAt ?? paidAt;

    // Load pack title
    const pack = await beatPackRepository.findById(packId);
    const packTitle = pack?.title ?? "Beat Pack";

    const verificationHash = computeLicenseHash({
      licenseNumber,
      buyerEmail,
      packId,
      licenseType: tier,
      effectiveAt,
    });

    // Render PDF
    const pdfBuffer = await generatePackLicensePdf({
      licenseNumber,
      packTitle,
      tier,
      buyerName,
      buyerEmail,
      beatTitles,
      amountPaid: totalAmount,
      effectiveDate: effectiveAt,
      issuedDate: now,
      receiptNumber,
      verificationHash,
      supersedes: previousCert
        ? {
            licenseNumber: previousCert.licenseNumber,
            previousTier: previousCert.licenseType,
            issuedDate: previousCert.issuedAt,
          }
        : undefined,
    });

    // Upload to storage
    const storageKey = buildStorageKey(buyerId, packId, licenseNumber);
    let uploadedKey = "";
    try {
      const result = await storageService.uploadBuffer(
        pdfBuffer,
        storageKey,
        "application/pdf"
      );
      uploadedKey = result.key;
    } catch (err) {
      logger.error("License PDF upload failed, will retry on download", {
        licenseNumber,
        packId,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // If upgrade: supersede the old cert
    if (previousCert) {
      // We create the new cert first, then supersede
      const newCert = await packLicenseRepository.create({
        buyerId: buyerId as unknown as IPackLicenseCertificate["buyerId"],
        packId: packId as unknown as IPackLicenseCertificate["packId"],
        orderId,
        licenseNumber,
        licenseType: tier,
        status: "active",
        storageKey: uploadedKey,
        previousCertificateId: previousCert._id as unknown as IPackLicenseCertificate["previousCertificateId"],
        upgradedFrom: previousCert.licenseType,
        buyerSnapshot: { name: buyerName, email: buyerEmail },
        packSnapshot: { title: packTitle, beatTitles },
        amountPaid: totalAmount,
        verificationHash,
        effectiveAt,
        issuedAt: now,
      });

      await packLicenseRepository.supersede(
        previousCert._id.toString(),
        newCert._id.toString()
      );

      audit({
        action: "license_certificate.superseded",
        userId: buyerId,
        resourceType: "pack_license_certificate",
        resourceId: previousCert._id.toString(),
        metadata: {
          supersededBy: newCert._id.toString(),
          fromTier: previousCert.licenseType,
          toTier: tier,
        },
      });

      audit({
        action: "license_certificate.issued",
        userId: buyerId,
        resourceType: "pack_license_certificate",
        resourceId: newCert._id.toString(),
        metadata: { licenseNumber, tier, packId, isUpgrade: true },
      });

      return newCert;
    }

    // New purchase
    const cert = await packLicenseRepository.create({
      buyerId: buyerId as unknown as IPackLicenseCertificate["buyerId"],
      packId: packId as unknown as IPackLicenseCertificate["packId"],
      orderId,
      licenseNumber,
      licenseType: tier,
      status: "active",
      storageKey: uploadedKey,
      buyerSnapshot: { name: buyerName, email: buyerEmail },
      packSnapshot: { title: packTitle, beatTitles },
      amountPaid: totalAmount,
      verificationHash,
      effectiveAt,
      issuedAt: now,
    });

    audit({
      action: "license_certificate.issued",
      userId: buyerId,
      resourceType: "pack_license_certificate",
      resourceId: cert._id.toString(),
      metadata: { licenseNumber, tier, packId, isUpgrade: false },
    });

    return cert;
  },

  async getActiveCertificate(
    buyerId: string,
    packId: string
  ): Promise<IPackLicenseCertificate | null> {
    return packLicenseRepository.findActive(buyerId, packId);
  },

  /**
   * Get a signed download URL for the active license certificate.
   * If the storageKey is missing (upload failed earlier), regenerate + upload.
   */
  async getDownloadUrl(buyerId: string, packId: string): Promise<string> {
    const cert = await packLicenseRepository.findActive(buyerId, packId);
    if (!cert) {
      throw new NotFoundError("No active license certificate found for this pack");
    }

    if (cert.buyerId.toString() !== buyerId) {
      throw new ForbiddenError("You do not have access to this license certificate");
    }

    if (cert.storageKey && cert.storageKey !== "generating") {
      return storageService.getDownloadUrl(cert.storageKey, {
        expiresInSeconds: 3600,
      });
    }

    // Lazy regeneration: claim the cert atomically
    const claimed = await packLicenseRepository.claimForRegeneration(
      cert._id.toString(),
      "generating"
    );

    if (!claimed) {
      // Another request is already generating — wait briefly and retry
      throw new NotFoundError("License certificate is being generated, please try again shortly");
    }

    try {
      const regenHash =
        cert.verificationHash ||
        computeLicenseHash({
          licenseNumber: cert.licenseNumber,
          buyerEmail: cert.buyerSnapshot.email,
          packId: cert.packId.toString(),
          licenseType: cert.licenseType,
          effectiveAt: cert.effectiveAt,
        });

      const pdfBuffer = await generatePackLicensePdf({
        licenseNumber: cert.licenseNumber,
        packTitle: cert.packSnapshot.title,
        tier: cert.licenseType,
        buyerName: cert.buyerSnapshot.name,
        buyerEmail: cert.buyerSnapshot.email,
        beatTitles: cert.packSnapshot.beatTitles,
        amountPaid: cert.amountPaid,
        effectiveDate: cert.effectiveAt,
        issuedDate: cert.issuedAt,
        receiptNumber: cert.orderId,
        verificationHash: regenHash,
      });

      const storageKey = buildStorageKey(buyerId, packId, cert.licenseNumber);
      await storageService.uploadBuffer(pdfBuffer, storageKey, "application/pdf");
      await packLicenseRepository.updateStorageKey(cert._id.toString(), storageKey);

      return storageService.getDownloadUrl(storageKey, {
        expiresInSeconds: 3600,
      });
    } catch (err) {
      // Reset so it can be retried
      await packLicenseRepository.updateStorageKey(cert._id.toString(), "");
      throw err;
    }
  },
};
