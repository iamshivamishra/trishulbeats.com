import mongoose, { Schema, Model } from "mongoose";
import type { IBeatPack } from "@/types";

const BeatPackSchema = new Schema<IBeatPack>(
  {
    title: { type: String, required: true, trim: true },
    metadata: { type: String, trim: true, maxlength: 2000 },
    description: { type: String, trim: true, maxlength: 1000 },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    coverUrl: { type: String, default: "" },
    imageUrls: [{ type: String }],
    tags: [{ type: String, trim: true }],
    beatIds: [{ type: Schema.Types.ObjectId, ref: "Beat", required: true }],
    prices: {
      basic: { type: Number, required: true, min: 1 },
      premium: { type: Number, required: true, min: 1 },
      unlimited: { type: Number, required: true, min: 1 },
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    isPublished: { type: Boolean, default: false },
    salesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

BeatPackSchema.index({ producerId: 1, status: 1 });
BeatPackSchema.index({ isPublished: 1, status: 1 });
BeatPackSchema.index({ createdAt: -1 });

const BeatPack: Model<IBeatPack> =
  mongoose.models.BeatPack || mongoose.model<IBeatPack>("BeatPack", BeatPackSchema);

export default BeatPack;

