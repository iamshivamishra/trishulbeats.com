import mongoose, { Schema, Model } from "mongoose";
import type { IOrder } from "@/types";

const OrderItemSchema = new Schema(
  {
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    licenseId: { type: Schema.Types.ObjectId, ref: "License", required: true },
    licenseType: {
      type: String,
      enum: ["basic", "premium", "unlimited"],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    beatTitle: { type: String, required: true },
    sourceType: { type: String, enum: ["beat", "pack", "upgrade"], default: "beat" },
    sourcePackId: { type: Schema.Types.ObjectId, ref: "BeatPack" },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    buyerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [OrderItemSchema], required: true, validate: [(v: unknown[]) => v.length > 0, "Order must have at least one item"] },
    totalAmount: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    razorpayOrderId: { type: String },
    razorpayPaymentId: { type: String },
    razorpaySignature: { type: String },
    receipt: { type: String, required: true, unique: true },
    couponCode: { type: String },
    couponId: { type: Schema.Types.ObjectId, ref: "Coupon" },
    discountAmount: { type: Number, default: 0 },
    discountPerPack: { type: Schema.Types.Mixed },
    subtotalAmount: { type: Number },
    failureReason: { type: String },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

OrderSchema.index({ buyerId: 1, status: 1 });
OrderSchema.index({ buyerId: 1, status: 1, "items.beatId": 1 });
OrderSchema.index({ createdAt: -1 });
OrderSchema.index({ razorpayOrderId: 1 }, { unique: true, sparse: true });

const Order: Model<IOrder> =
  mongoose.models.Order || mongoose.model<IOrder>("Order", OrderSchema);

export default Order;
