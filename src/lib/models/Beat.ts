import mongoose, { Schema, Model } from "mongoose";
import type { IBeat } from "@/types";

const BeatSchema = new Schema<IBeat>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, maxlength: 1000 },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    bpm: { type: Number, min: 40, max: 300 },
    key: { type: String, trim: true },
    genre: { type: String, required: true, trim: true },
    tags: [{ type: String, trim: true }],
    mood: { type: String, trim: true },
    duration: { type: Number, default: 0 },
    audioTaggedUrl: { type: String, required: true },
    audioFullUrl: { type: String, required: true },
    stemsUrl: { type: String },
    coverUrl: { type: String, default: "" },
    storageKeys: {
      preview: String,
      master: String,
      stems: String,
      artwork: String,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
    },
    plays: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    likesCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    saleMode: {
      type: String,
      enum: ["single", "pack_only"],
      default: "single",
    },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
  },
  { timestamps: true }
);

BeatSchema.index({ genre: 1, isPublished: 1 });
BeatSchema.index({ producerId: 1, status: 1 });
BeatSchema.index({ plays: -1 });
BeatSchema.index({ likesCount: -1 });
BeatSchema.index({ createdAt: -1 });
BeatSchema.index({ title: "text", tags: "text" });
BeatSchema.index({ saleMode: 1, isPublished: 1 });
BeatSchema.index({ packId: 1, saleMode: 1 });

const Beat: Model<IBeat> =
  mongoose.models.Beat || mongoose.model<IBeat>("Beat", BeatSchema);

export default Beat;
