import { connectDB } from "@/lib/db";
import PackLicenseCertificate from "@/lib/models/PackLicenseCertificate";
import type { IPackLicenseCertificate } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const packLicenseRepository = {
  async findByOrderId(orderId: string): Promise<IPackLicenseCertificate | null> {
    await connectDB();
    return PackLicenseCertificate.findOne({ orderId }).lean<IPackLicenseCertificate>();
  },

  async findActive(
    buyerId: string,
    packId: string
  ): Promise<IPackLicenseCertificate | null> {
    await connectDB();
    return PackLicenseCertificate.findOne({
      buyerId,
      packId,
      status: "active",
    }).lean<IPackLicenseCertificate>();
  },

  async findByLicenseNumber(
    licenseNumber: string
  ): Promise<IPackLicenseCertificate | null> {
    await connectDB();
    return PackLicenseCertificate.findOne({ licenseNumber }).lean<IPackLicenseCertificate>();
  },

  async findById(id: string): Promise<IPackLicenseCertificate | null> {
    await connectDB();
    return PackLicenseCertificate.findById(id).lean<IPackLicenseCertificate>();
  },

  async create(
    data: Partial<IPackLicenseCertificate>,
    options: RepoOptions = {}
  ): Promise<IPackLicenseCertificate> {
    await connectDB();
    if (options.session) {
      const docs = await PackLicenseCertificate.create([data], {
        session: options.session,
      });
      return docs[0].toObject() as IPackLicenseCertificate;
    }
    const doc = await PackLicenseCertificate.create(data);
    return doc.toObject() as IPackLicenseCertificate;
  },

  async supersede(
    certId: string,
    supersededByCertId: string,
    options: RepoOptions = {}
  ): Promise<IPackLicenseCertificate | null> {
    await connectDB();
    return PackLicenseCertificate.findByIdAndUpdate(
      certId,
      { status: "superseded", supersededBy: supersededByCertId },
      { new: true, session: options.session ?? null }
    ).lean<IPackLicenseCertificate>();
  },

  /**
   * Atomically claim a cert with missing storageKey for lazy regeneration.
   * Returns null if another request already claimed it.
   */
  async claimForRegeneration(
    certId: string,
    sentinel: string
  ): Promise<IPackLicenseCertificate | null> {
    await connectDB();
    return PackLicenseCertificate.findOneAndUpdate(
      { _id: certId, storageKey: "" },
      { storageKey: sentinel },
      { new: true }
    ).lean<IPackLicenseCertificate>();
  },

  async updateStorageKey(
    certId: string,
    storageKey: string
  ): Promise<void> {
    await connectDB();
    await PackLicenseCertificate.updateOne({ _id: certId }, { storageKey });
  },
};
