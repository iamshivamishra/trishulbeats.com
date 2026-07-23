import mongoose, { Schema, Model } from "mongoose";
import type { IBeatPackCartItem } from "@/types";

const PackCartItemSchema = new Schema<IBeatPackCartItem>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack", required: true },
    tier: { type: String, enum: ["basic", "premium", "unlimited"], required: true },
    addedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

PackCartItemSchema.index({ userId: 1 });
PackCartItemSchema.index({ userId: 1, packId: 1 }, { unique: true });

const PackCartItem: Model<IBeatPackCartItem> =
  mongoose.models.PackCartItem || mongoose.model<IBeatPackCartItem>("PackCartItem", PackCartItemSchema);

export default PackCartItem;

