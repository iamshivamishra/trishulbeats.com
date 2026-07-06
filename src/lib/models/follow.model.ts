import mongoose, { Schema, models, model } from "mongoose";

export interface IFollow {
  follower: mongoose.Types.ObjectId; // the user who is following
  following: mongoose.Types.ObjectId; // the producer being followed
  createdAt: Date;
}

const followSchema = new Schema<IFollow>({
  follower: { type: Schema.Types.ObjectId, ref: "User", required: true },
  following: { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

// Prevent the same user from following the same producer twice
followSchema.index({ follower: 1, following: 1 }, { unique: true });

export const Follow = models.Follow || model<IFollow>("Follow", followSchema);