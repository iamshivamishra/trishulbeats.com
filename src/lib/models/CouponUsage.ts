import mongoose, { Schema, Model } from "mongoose";
import type { ICouponUsage } from "@/types";

const CouponUsageSchema = new Schema<ICouponUsage>(
  {
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true },
    packId: { type: Schema.Types.ObjectId, ref: "BeatPack", required: true },
    discount: { type: Number, required: true, min: 0 },
    usedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

CouponUsageSchema.index({ couponId: 1, userId: 1 });
CouponUsageSchema.index({ couponId: 1, userId: 1, orderId: 1 }, { unique: true });
CouponUsageSchema.index({ orderId: 1 });

const CouponUsage: Model<ICouponUsage> =
  mongoose.models.CouponUsage ||
  mongoose.model<ICouponUsage>("CouponUsage", CouponUsageSchema);

export default CouponUsage;
