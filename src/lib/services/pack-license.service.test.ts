import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/pack-license.repository", () => ({
  packLicenseRepository: {
    findByOrderId: vi.fn(),
    findActive: vi.fn(),
    create: vi.fn(),
    supersede: vi.fn(),
    claimForRegeneration: vi.fn(),
    updateStorageKey: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat-pack.repository", () => ({
  beatPackRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    uploadBuffer: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

vi.mock("@/lib/pdf/pack-license-pdf", () => ({
  generatePackLicensePdf: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/lib/license-hash", () => ({
  computeLicenseHash: vi.fn(() => "mock-hash-abc123"),
}));

vi.mock("@/lib/errors", () => {
  class ForbiddenError extends Error {}
  class NotFoundError extends Error {}
  return { ForbiddenError, NotFoundError };
});

import { packLicenseRepository } from "@/lib/repositories/pack-license.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { storageService } from "@/lib/services/storage.service";
import { generatePackLicensePdf } from "@/lib/pdf/pack-license-pdf";
import { audit } from "@/lib/audit";
import { packLicenseService } from "./pack-license.service";

const mockOrder = {
  _id: "order1",
  buyerId: "buyer1",
  status: "paid",
  receipt: "rcpt_test",
  paidAt: new Date("2026-01-15"),
  createdAt: new Date("2026-01-15"),
  items: [
    {
      beatId: "beat1",
      licenseId: "lic1",
      licenseType: "premium" as const,
      price: 500,
      beatTitle: "Beat One",
      sourceType: "pack" as const,
      sourcePackId: "pack1",
    },
    {
      beatId: "beat2",
      licenseId: "lic2",
      licenseType: "premium" as const,
      price: 500,
      beatTitle: "Beat Two",
      sourceType: "pack" as const,
      sourcePackId: "pack1",
    },
  ],
  totalAmount: 1000,
};

const mockBuyer = { _id: "buyer1", name: "Test Buyer", displayName: "Test Buyer", email: "test@example.com" };
const mockPack = { _id: "pack1", title: "Indian Beat Collection" };

describe("packLicenseService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("issueForOrder", () => {
    it("skips if order is not paid", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue({
        ...mockOrder,
        status: "pending",
      } as never);

      await packLicenseService.issueForOrder("order1");
      expect(packLicenseRepository.create).not.toHaveBeenCalled();
    });

    it("skips if certificate already exists (idempotent)", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as never);
      vi.mocked(packLicenseRepository.findByOrderId).mockResolvedValue({
        _id: "cert1",
      } as never);

      await packLicenseService.issueForOrder("order1");
      expect(packLicenseRepository.create).not.toHaveBeenCalled();
    });

    it("skips if no pack items in order", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue({
        ...mockOrder,
        items: [
          { ...mockOrder.items[0], sourceType: "beat", sourcePackId: undefined },
        ],
      } as never);
      vi.mocked(packLicenseRepository.findByOrderId).mockResolvedValue(null);

      await packLicenseService.issueForOrder("order1");
      expect(packLicenseRepository.create).not.toHaveBeenCalled();
    });

    it("creates a certificate for a new pack purchase", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as never);
      vi.mocked(packLicenseRepository.findByOrderId).mockResolvedValue(null);
      vi.mocked(userRepository.findById).mockResolvedValue(mockBuyer as never);
      vi.mocked(beatPackRepository.findById).mockResolvedValue(mockPack as never);
      vi.mocked(generatePackLicensePdf).mockResolvedValue(Buffer.from("pdf"));
      vi.mocked(storageService.uploadBuffer).mockResolvedValue({ key: "licenses/buyer1/pack1/TB-LIC-2026-ABC123.pdf" });
      vi.mocked(packLicenseRepository.create).mockResolvedValue({
        _id: "cert_new",
        licenseNumber: "TB-LIC-2026-ABC123",
      } as never);

      await packLicenseService.issueForOrder("order1");

      expect(packLicenseRepository.create).toHaveBeenCalledTimes(1);
      expect(generatePackLicensePdf).toHaveBeenCalledTimes(1);
      expect(storageService.uploadBuffer).toHaveBeenCalledTimes(1);

      const createCall = vi.mocked(packLicenseRepository.create).mock.calls[0][0];
      expect(createCall).toMatchObject({
        orderId: "order1",
        licenseType: "premium",
        status: "active",
        buyerSnapshot: { name: "Test Buyer", email: "test@example.com" },
        packSnapshot: {
          title: "Indian Beat Collection",
          beatTitles: ["Beat One", "Beat Two"],
        },
      });

      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "license_certificate.issued" })
      );
    });

    it("creates certificate even if S3 upload fails (lazy regeneration)", async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as never);
      vi.mocked(packLicenseRepository.findByOrderId).mockResolvedValue(null);
      vi.mocked(userRepository.findById).mockResolvedValue(mockBuyer as never);
      vi.mocked(beatPackRepository.findById).mockResolvedValue(mockPack as never);
      vi.mocked(generatePackLicensePdf).mockResolvedValue(Buffer.from("pdf"));
      vi.mocked(storageService.uploadBuffer).mockRejectedValue(new Error("S3 down"));
      vi.mocked(packLicenseRepository.create).mockResolvedValue({
        _id: "cert_new",
        licenseNumber: "TB-LIC-2026-XYZ",
      } as never);

      await packLicenseService.issueForOrder("order1");

      expect(packLicenseRepository.create).toHaveBeenCalledTimes(1);
      const createCall = vi.mocked(packLicenseRepository.create).mock.calls[0][0];
      expect(createCall).toMatchObject({ storageKey: "" });
    });
  });

  describe("issueForOrder (upgrade)", () => {
    it("supersedes old certificate on upgrade", async () => {
      const upgradeOrder = {
        ...mockOrder,
        items: mockOrder.items.map((item) => ({
          ...item,
          sourceType: "upgrade" as const,
          licenseType: "unlimited" as const,
        })),
      };
      const oldCert = {
        _id: "cert_old",
        licenseNumber: "TB-LIC-2026-OLD",
        licenseType: "premium",
        effectiveAt: new Date("2025-06-01"),
        issuedAt: new Date("2025-06-01"),
        buyerSnapshot: { name: "Test Buyer", email: "test@example.com" },
        packSnapshot: { title: "Indian Beat Collection", beatTitles: ["Beat One", "Beat Two"] },
      };

      vi.mocked(orderRepository.findById).mockResolvedValue(upgradeOrder as never);
      vi.mocked(packLicenseRepository.findByOrderId).mockResolvedValue(null);
      vi.mocked(userRepository.findById).mockResolvedValue(mockBuyer as never);
      vi.mocked(beatPackRepository.findById).mockResolvedValue(mockPack as never);
      vi.mocked(packLicenseRepository.findActive).mockResolvedValue(oldCert as never);
      vi.mocked(generatePackLicensePdf).mockResolvedValue(Buffer.from("pdf"));
      vi.mocked(storageService.uploadBuffer).mockResolvedValue({ key: "licenses/buyer1/pack1/TB-LIC-2026-NEW.pdf" });
      vi.mocked(packLicenseRepository.create).mockResolvedValue({
        _id: "cert_new",
        licenseNumber: "TB-LIC-2026-NEW",
      } as never);
      vi.mocked(packLicenseRepository.supersede).mockResolvedValue(null);

      await packLicenseService.issueForOrder("order1");

      // Should supersede old cert
      expect(packLicenseRepository.supersede).toHaveBeenCalledWith(
        "cert_old",
        "cert_new"
      );

      // New cert should reference previous and carry effectiveAt
      const createCall = vi.mocked(packLicenseRepository.create).mock.calls[0][0];
      expect(createCall).toMatchObject({
        licenseType: "unlimited",
        upgradedFrom: "premium",
        effectiveAt: new Date("2025-06-01"),
      });

      // PDF should include supersedes info
      const pdfCall = vi.mocked(generatePackLicensePdf).mock.calls[0][0];
      expect(pdfCall.supersedes).toEqual({
        licenseNumber: "TB-LIC-2026-OLD",
        previousTier: "premium",
        issuedDate: oldCert.issuedAt,
      });

      // Two audit calls: superseded + issued
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "license_certificate.superseded" })
      );
      expect(audit).toHaveBeenCalledWith(
        expect.objectContaining({ action: "license_certificate.issued" })
      );
    });
  });

  describe("getDownloadUrl", () => {
    it("returns signed URL when storageKey exists", async () => {
      vi.mocked(packLicenseRepository.findActive).mockResolvedValue({
        _id: "cert1",
        buyerId: "buyer1",
        storageKey: "licenses/buyer1/pack1/TB-LIC-2026-ABC.pdf",
      } as never);
      vi.mocked(storageService.getDownloadUrl).mockResolvedValue("https://signed-url");

      const url = await packLicenseService.getDownloadUrl("buyer1", "pack1");
      expect(url).toBe("https://signed-url");
    });

    it("throws NotFoundError when no active certificate", async () => {
      vi.mocked(packLicenseRepository.findActive).mockResolvedValue(null);

      await expect(
        packLicenseService.getDownloadUrl("buyer1", "pack1")
      ).rejects.toThrow();
    });

    it("throws ForbiddenError when buyerId does not match", async () => {
      vi.mocked(packLicenseRepository.findActive).mockResolvedValue({
        _id: "cert1",
        buyerId: "other_user",
        storageKey: "some-key",
      } as never);

      await expect(
        packLicenseService.getDownloadUrl("buyer1", "pack1")
      ).rejects.toThrow();
    });
  });
});
