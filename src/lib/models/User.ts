import mongoose, { Schema, Model } from "mongoose";
import type { IUser } from "@/types";

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String },
    password: { type: String, select: false },
    role: { type: String, enum: ["buyer", "producer", "admin"], default: "buyer" },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    displayName: { type: String, trim: true, maxlength: 60 },
    bio: { type: String, trim: true, maxlength: 500 },
    avatarUrl: { type: String },
    coverImageUrl: { type: String },
    genres: [{ type: String, trim: true }],
    socialLinks: {
      instagram: String,
      youtube: String,
      twitter: String,
      website: String,
      spotify: String,
      soundcloud: String,
    },
    verified: { type: Boolean, default: false },
    followersCount: { type: Number, default: 0 },
    salesCount: { type: Number, default: 0 },
    resetToken: { type: String, select: false },
    resetTokenExpiry: { type: Date, select: false },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
