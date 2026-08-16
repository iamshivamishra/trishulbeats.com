import mongoose, { Schema, Model } from "mongoose";
import type { IPackLicenseCertificate } from "@/types";

const BuyerSnapshotSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
  },
  { _id: false }
);

const PackSnapshotSchema = new Schema(
  {
    title: { type: String, required: true },
    beatTitles: [{ type: String }],
  },
  { _id: false }
);

const PackLicenseCertificateSchema = new Schema<IPackLicenseCertificate>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack", required: true },
    orderId: { type: String, required: true },
    licenseNumber: { type: String, required: true },
    licenseType: {
      type: String,
      enum: ["basic", "premium", "unlimited"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "superseded"],
      default: "active",
    },
    storageKey: { type: String, default: "" },
    supersededBy: { type: Schema.Types.ObjectId, ref: "PackLicenseCertificate" },
    previousCertificateId: { type: Schema.Types.ObjectId, ref: "PackLicenseCertificate" },
    upgradedFrom: { type: String },
    buyerSnapshot: { type: BuyerSnapshotSchema, required: true },
    packSnapshot: { type: PackSnapshotSchema, required: true },
    amountPaid: { type: Number, required: true },
    verificationHash: { type: String, default: "" },
    effectiveAt: { type: Date, required: true },
    issuedAt: { type: Date, required: true },
  },
  { timestamps: true }
);

PackLicenseCertificateSchema.index({ buyerId: 1, packId: 1, status: 1 });
PackLicenseCertificateSchema.index({ orderId: 1 }, { unique: true });
PackLicenseCertificateSchema.index({ licenseNumber: 1 }, { unique: true });

const PackLicenseCertificate: Model<IPackLicenseCertificate> =
  mongoose.models.PackLicenseCertificate ||
  mongoose.model<IPackLicenseCertificate>("PackLicenseCertificate", PackLicenseCertificateSchema);

export default PackLicenseCertificate;
