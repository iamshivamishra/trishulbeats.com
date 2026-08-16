import mongoose, { Schema, Model } from "mongoose";
import type { ICoupon } from "@/types";

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, maxlength: 200 },
    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 0.01 },
    maxDiscountCap: { type: Number },
    minOrderAmount: { type: Number },
    applicablePacks: [{ type: Schema.Types.ObjectId, ref: "BeatPack" }],
    restrictedToUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
    restrictedToEmails: [{ type: String, lowercase: true, trim: true }],
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    maxUses: { type: Number, default: 0, min: 0 },
    maxUsesPerUser: { type: Number, default: 1, min: 0 },
    currentUses: { type: Number, default: 0, min: 0 },
    isDraft: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

CouponSchema.index({ producerId: 1, isActive: 1 });
CouponSchema.index({ expiresAt: 1 });

const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
