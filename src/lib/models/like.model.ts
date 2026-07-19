import { Schema, models, model } from "mongoose";
import type { ILike } from "@/types";

const likeSchema = new Schema<ILike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
  },
  { timestamps: true }
);

likeSchema.index({ userId: 1, beatId: 1 }, { unique: true });
likeSchema.index({ beatId: 1, createdAt: -1 });

export const Like = models.Like || model<ILike>("Like", likeSchema);
