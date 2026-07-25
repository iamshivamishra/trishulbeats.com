import mongoose, { Schema, Model } from "mongoose";
import type { IPurchase } from "@/types";

const PurchaseSchema = new Schema<IPurchase>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    licenseId: { type: Schema.Types.ObjectId, ref: "License", required: true },
    licenseType: { type: String, enum: ["basic", "premium", "unlimited", "exclusive"], required: true },
    includesWav: { type: Boolean, default: false },
    includesStems: { type: Boolean, default: false },
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    amount: { type: Number, required: true },
    sourceType: { type: String, enum: ["beat", "pack"], default: "beat" },
    sourcePackId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
  },
  { timestamps: true }
);

PurchaseSchema.index({ buyerId: 1, beatId: 1 }, { unique: true });
PurchaseSchema.index({ buyerId: 1 });
PurchaseSchema.index({ beatId: 1 });
PurchaseSchema.index({ beatId: 1, createdAt: -1 });

const Purchase: Model<IPurchase> =
  mongoose.models.Purchase || mongoose.model<IPurchase>("Purchase", PurchaseSchema);

export default Purchase;
