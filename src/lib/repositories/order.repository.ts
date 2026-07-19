import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import type { IOrder, OrderStatus } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const orderRepository = {
  async create(data: Partial<IOrder>, options: RepoOptions = {}): Promise<IOrder> {
    await connectDB();
    const order = await Order.create([data], { session: options.session });
    return order[0].toObject() as IOrder;
  },

  async attachRazorpayOrderId(
    id: string,
    razorpayOrderId: string,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findByIdAndUpdate(
      id,
      { razorpayOrderId },
      { new: true, session: options.session }
    ).lean<IOrder>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<IOrder | null> {
    await connectDB();
    return Order.findById(id).session(options.session ?? null).lean<IOrder>();
  },

  async findByRazorpayOrderId(
    razorpayOrderId: string,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({ razorpayOrderId }).session(options.session ?? null).lean<IOrder>();
  },

  async findPendingByBuyerAndBeat(
    buyerId: string,
    beatId: string,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({
      buyerId,
      status: "pending",
      "items.beatId": beatId,
    })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IOrder>();
  },

  async findPendingByBuyerAndBeatIds(
    buyerId: string,
    beatIds: string[],
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    if (beatIds.length === 0) return null;
    return Order.findOne({
      buyerId,
      status: "pending",
      "items.beatId": { $in: beatIds },
    })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IOrder>();
  },

  async updateStatus(
    id: string,
    status: OrderStatus,
    paymentData?: {
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      paidAt?: Date;
      failureReason?: string;
    },
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findByIdAndUpdate(
      id,
      { status, ...paymentData },
      { new: true, session: options.session }
    ).lean<IOrder>();
  },

  async markPaidIfPending(
    id: string,
    paymentData: {
      razorpayPaymentId: string;
      razorpaySignature: string;
      paidAt: Date;
    },
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOneAndUpdate(
      { _id: id, status: "pending" },
      { status: "paid", ...paymentData },
      { new: true, session: options.session }
    ).lean<IOrder>();
  },

  async findByBuyer(
    buyerId: string,
    status?: OrderStatus,
    options: RepoOptions = {}
  ): Promise<IOrder[]> {
    await connectDB();
    const query: Record<string, unknown> = { buyerId };
    if (status) query.status = status;
    return Order.find(query)
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IOrder[]>();
  },

  async countByBuyer(buyerId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    return Order.countDocuments({ buyerId, status: "paid" }).session(options.session ?? null);
  },
};
