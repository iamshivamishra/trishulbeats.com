import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { cartRepository } from "@/lib/repositories/cart.repository";
import { cartService } from "@/lib/services/cart.service";
import { withTransaction } from "@/lib/db";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { razorpay, verifySignature } from "@/lib/razorpay";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type {
  CreateOrderInput,
  VerifyPaymentInput,
  CheckoutCartInput,
} from "@/lib/validators/payment";
import type { IOrder, IPurchase, IOrderItem } from "@/types";

function generateReceipt(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `rcpt_${ts}_${rand}`;
}

export const paymentService = {
  /**  
   * Create a Razorpay order for a single beat+license (direct buy).
   */
  async createOrder(
    input: CreateOrderInput,
    buyerId: string
  ): Promise<{ orderId: string; amount: number; currency: string; internalOrderId: string }> {
    const already = await purchaseRepository.hasPurchased(buyerId, input.beatId);
    if (already) {
      throw new ConflictError("You have already purchased this beat");
    }

    const license = await licenseRepository.findById(input.licenseId);
    if (!license || !license.isActive) throw new NotFoundError("License");
    if (license.beatId.toString() !== input.beatId) {
      throw new ConflictError("License does not belong to this beat");
    }

    const beat = await beatRepository.findById(input.beatId);
    if (!beat) throw new NotFoundError("Beat");
    if (!beat.isPublished || beat.status !== "published") {
      throw new ConflictError("This beat is not available for purchase");
    }

    const receipt = generateReceipt();

    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: [
        {
          beatId: input.beatId as unknown as IOrderItem["beatId"],
          licenseId: input.licenseId as unknown as IOrderItem["licenseId"],
          licenseType: license.type,
          price: license.price,
          beatTitle: beat.title,
        },
      ],
      totalAmount: license.price,
      status: "pending",
      receipt,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: license.price * 100,
      currency: "INR",
      receipt,
      notes: {
        internalOrderId: order._id.toString(),
        buyerId,
      },
    });
    await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

    logger.info("Order created", {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      amount: license.price,
    });
    audit({
      action: "payment.order_created",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { amount: license.price, beatId: input.beatId },
    });

    return {
      orderId: razorpayOrder.id,
      amount: license.price,
      currency: "INR",
      internalOrderId: order._id.toString(),
    };
  },

  /**
   * Create a Razorpay order for the entire cart.
   */
  async checkoutCart(
    _input: CheckoutCartInput,
    buyerId: string
  ): Promise<{ orderId: string; amount: number; currency: string; internalOrderId: string }> {
    const cartItems = await cartService.getItems(buyerId);
    if (cartItems.length === 0) {
      throw new ConflictError("Your cart is empty");
    }

    // Validate none are already purchased
    for (const item of cartItems) {
      const already = await purchaseRepository.hasPurchased(buyerId, item.beatId);
      if (already) {
        throw new ConflictError(
          `You already own "${item.beatTitle}". Remove it from your cart.`
        );
      }
    }

    const orderItems: IOrderItem[] = cartItems.map((item) => ({
      beatId: item.beatId as unknown as IOrderItem["beatId"],
      licenseId: item.licenseId as unknown as IOrderItem["licenseId"],
      licenseType: item.licenseType,
      price: item.price,
      beatTitle: item.beatTitle,
    }));

    const totalAmount = cartItems.reduce((sum, i) => sum + i.price, 0);
    const receipt = generateReceipt();

    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: orderItems,
      totalAmount,
      status: "pending",
      receipt,
    });

    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt,
      notes: {
        internalOrderId: order._id.toString(),
        buyerId,
        itemCount: String(cartItems.length),
      },
    });

    await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

    logger.info("Cart checkout order created", {
      orderId: order._id,
      razorpayOrderId: razorpayOrder.id,
      items: cartItems.length,
      totalAmount,
    });
    audit({
      action: "cart.checkout",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { items: cartItems.length, totalAmount },
    });

    return {
      orderId: razorpayOrder.id,
      amount: totalAmount,
      currency: "INR",
      internalOrderId: order._id.toString(),
    };
  },

  /**
   * Verify Razorpay signature, record purchases, run post-purchase hooks.
   */
  async verifyAndRecord(
    input: VerifyPaymentInput,
    buyerId: string
  ): Promise<{ order: IOrder; purchases: IPurchase[] }> {
    const isValid = verifySignature(input.orderId, input.paymentId, input.signature);

    const order = await orderRepository.findByRazorpayOrderId(input.orderId);
    if (!order) throw new NotFoundError("Order");

    if (order.buyerId.toString() !== buyerId) {
      throw new ConflictError("Order does not belong to this user");
    }

    if (order.status !== "pending") {
      throw new ConflictError("This order can no longer be processed");
    }

    if (!isValid) {
      await orderRepository.updateStatus(order._id.toString(), "failed", {
        razorpayPaymentId: input.paymentId,
        failureReason: "Invalid payment signature",
      });

      logger.warn("Payment verification failed", {
        orderId: order._id,
        razorpayOrderId: input.orderId,
      });
      audit({
        action: "payment.signature_invalid",
        userId: buyerId,
        resourceType: "order",
        resourceId: order._id.toString(),
      });

      throw new ValidationError("Payment verification failed", {
        signature: ["Invalid payment signature"],
      });
    }

    const result = await withTransaction(async (session) => {
      const paidOrder = await orderRepository.markPaidIfPending(
        order._id.toString(),
        {
          razorpayPaymentId: input.paymentId,
          razorpaySignature: input.signature,
          paidAt: new Date(),
        },
        { session }
      );
      if (!paidOrder) {
        throw new ConflictError("This order has already been processed");
      }

      const purchases: IPurchase[] = [];

      for (const item of paidOrder.items) {
        const beatId = item.beatId.toString();
        const [beat, license, alreadyPurchased] = await Promise.all([
          beatRepository.findById(beatId, false, { session }),
          licenseRepository.findById(item.licenseId.toString(), { session }),
          purchaseRepository.hasPurchased(buyerId, beatId, { session }),
        ]);

        if (alreadyPurchased) {
          throw new ConflictError(`Beat "${item.beatTitle}" has already been purchased`);
        }
        if (!beat) {
          throw new NotFoundError("Beat");
        }
        if (!beat.isPublished || beat.status !== "published") {
          throw new ConflictError("Beat is no longer available for purchase");
        }
        if (!license || !license.isActive) {
          throw new ConflictError("License is no longer available");
        }
        if (license.beatId.toString() !== beatId) {
          throw new ConflictError("License does not belong to this beat");
        }

        const purchase = await purchaseRepository.create(
          {
            buyerId: buyerId as unknown as IPurchase["buyerId"],
            beatId: item.beatId as unknown as IPurchase["beatId"],
            licenseId: item.licenseId as unknown as IPurchase["licenseId"],
            licenseType: item.licenseType,
            includesWav: license.includesWav,
            includesStems: license.includesStems,
            orderId: input.orderId,
            paymentId: input.paymentId,
            amount: item.price,
          },
          { session }
        );
        purchases.push(purchase);

        await beatRepository.incrementSalesCount(beatId, { session });
        await userRepository.incrementSalesCount(beat.producerId.toString(), { session });
      }

      if (purchases.length === 0) {
        throw new ConflictError("Payment captured but purchase creation failed");
      }

      await cartRepository.clear(buyerId, { session });

      return { paidOrder, purchases };
    });

    logger.info("Payment verified and recorded", {
      orderId: order._id,
      purchaseCount: result.purchases.length,
      totalAmount: result.paidOrder.totalAmount,
    });
    audit({
      action: "payment.verified",
      userId: buyerId,
      resourceType: "order",
      resourceId: result.paidOrder._id.toString(),
      metadata: { purchaseCount: result.purchases.length, totalAmount: result.paidOrder.totalAmount },
    });

    const updatedOrder = await orderRepository.findById(result.paidOrder._id.toString());

    return {
      order: updatedOrder!,
      purchases: result.purchases,
    };
  },

  /**
   * Mark an order as failed (called on payment dismissal or error).
   */
  async markFailed(
    razorpayOrderId: string,
    buyerId: string,
    reason: string
  ): Promise<void> {
    const order = await orderRepository.findByRazorpayOrderId(razorpayOrderId);
    if (!order) return;
    if (order.buyerId.toString() !== buyerId) return;
    if (order.status !== "pending") return;

    await orderRepository.updateStatus(order._id.toString(), "failed", {
      failureReason: reason,
    });

    logger.info("Order marked as failed", {
      orderId: order._id,
      reason,
    });
    audit({
      action: "payment.failed",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { reason },
    });
  },

  async getPurchasedBeatIds(buyerId: string): Promise<string[]> {
    return purchaseRepository.getPurchasedBeatIds(buyerId);
  },

  async getPurchaseHistory(buyerId: string): Promise<IPurchase[]> {
    return purchaseRepository.findByBuyerId(buyerId);
  },

  async getOrderHistory(buyerId: string): Promise<IOrder[]> {
    return orderRepository.findByBuyer(buyerId);
  },

  async getProducerEarnings(producerId: string): Promise<number> {
    return purchaseRepository.getEarningsByProducer(producerId);
  },
};
