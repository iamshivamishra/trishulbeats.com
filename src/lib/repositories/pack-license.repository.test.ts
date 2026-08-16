import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/PackLicenseCertificate", () => ({
  default: {
    findOne: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateOne: vi.fn(),
  },
}));

import PackLicenseCertificate from "@/lib/models/PackLicenseCertificate";
import { packLicenseRepository } from "./pack-license.repository";

function chainable(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.skip = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.session = vi.fn().mockReturnValue(chain);
  chain.populate = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const mockCert = {
  _id: "cert1",
  orderId: "order1",
  buyerId: "buyer1",
  packId: "pack1",
  licenseNumber: "LIC-001",
  status: "active",
  storageKey: "licenses/cert1.pdf",
};

describe("packLicenseRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findByOrderId", () => {
    it("finds by orderId", async () => {
      vi.mocked(PackLicenseCertificate.findOne).mockReturnValue(
        chainable(mockCert) as never
      );

      const result = await packLicenseRepository.findByOrderId("order1");

      expect(result).toEqual(mockCert);
      expect(PackLicenseCertificate.findOne).toHaveBeenCalledWith({ orderId: "order1" });
    });
  });

  describe("findActive", () => {
    it("finds by buyerId, packId, and active status", async () => {
      vi.mocked(PackLicenseCertificate.findOne).mockReturnValue(
        chainable(mockCert) as never
      );

      const result = await packLicenseRepository.findActive("buyer1", "pack1");

      expect(result).toEqual(mockCert);
      expect(PackLicenseCertificate.findOne).toHaveBeenCalledWith({
        buyerId: "buyer1",
        packId: "pack1",
        status: "active",
      });
    });
  });

  describe("findByLicenseNumber", () => {
    it("finds by license number", async () => {
      vi.mocked(PackLicenseCertificate.findOne).mockReturnValue(
        chainable(mockCert) as never
      );

      const result = await packLicenseRepository.findByLicenseNumber("LIC-001");

      expect(result).toEqual(mockCert);
      expect(PackLicenseCertificate.findOne).toHaveBeenCalledWith({
        licenseNumber: "LIC-001",
      });
    });
  });

  describe("findById", () => {
    it("finds by id", async () => {
      vi.mocked(PackLicenseCertificate.findById).mockReturnValue(
        chainable(mockCert) as never
      );

      const result = await packLicenseRepository.findById("cert1");

      expect(result).toEqual(mockCert);
      expect(PackLicenseCertificate.findById).toHaveBeenCalledWith("cert1");
    });
  });

  describe("create", () => {
    it("with session uses array form", async () => {
      const session = {} as never;
      vi.mocked(PackLicenseCertificate.create).mockResolvedValue([
        { toObject: () => mockCert },
      ] as never);

      const result = await packLicenseRepository.create(
        { orderId: "order1" },
        { session }
      );

      expect(result).toEqual(mockCert);
      expect(PackLicenseCertificate.create).toHaveBeenCalledWith(
        [{ orderId: "order1" }],
        { session }
      );
    });

    it("without session uses direct create", async () => {
      vi.mocked(PackLicenseCertificate.create).mockResolvedValue({
        toObject: () => mockCert,
      } as never);

      const result = await packLicenseRepository.create({ orderId: "order1" });

      expect(result).toEqual(mockCert);
      expect(PackLicenseCertificate.create).toHaveBeenCalledWith({ orderId: "order1" });
    });
  });

  describe("supersede", () => {
    it("sets status to superseded and supersededBy", async () => {
      const superseded = { ...mockCert, status: "superseded", supersededBy: "cert2" };
      vi.mocked(PackLicenseCertificate.findByIdAndUpdate).mockReturnValue(
        chainable(superseded) as never
      );

      const result = await packLicenseRepository.supersede("cert1", "cert2");

      expect(result).toEqual(superseded);
      expect(PackLicenseCertificate.findByIdAndUpdate).toHaveBeenCalledWith(
        "cert1",
        { status: "superseded", supersededBy: "cert2" },
        { new: true, session: null }
      );
    });
  });

  describe("claimForRegeneration", () => {
    it("finds by storageKey empty string and updates", async () => {
      vi.mocked(PackLicenseCertificate.findOneAndUpdate).mockReturnValue(
        chainable({ ...mockCert, storageKey: "REGENERATING:abc" }) as never
      );

      const result = await packLicenseRepository.claimForRegeneration(
        "cert1",
        "REGENERATING:abc"
      );

      expect(result).toEqual({ ...mockCert, storageKey: "REGENERATING:abc" });
      expect(PackLicenseCertificate.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "cert1", storageKey: "" },
        { storageKey: "REGENERATING:abc" },
        { new: true }
      );
    });

    it("returns null when already claimed", async () => {
      vi.mocked(PackLicenseCertificate.findOneAndUpdate).mockReturnValue(
        chainable(null) as never
      );

      const result = await packLicenseRepository.claimForRegeneration(
        "cert1",
        "REGENERATING:abc"
      );

      expect(result).toBeNull();
    });
  });

  describe("updateStorageKey", () => {
    it("calls updateOne with storageKey", async () => {
      vi.mocked(PackLicenseCertificate.updateOne).mockResolvedValue({
        modifiedCount: 1,
      } as never);

      await packLicenseRepository.updateStorageKey("cert1", "licenses/cert1.pdf");

      expect(PackLicenseCertificate.updateOne).toHaveBeenCalledWith(
        { _id: "cert1" },
        { storageKey: "licenses/cert1.pdf" }
      );
    });
  });
});
