import crypto from "crypto";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { orderRepository } from "@/lib/repositories/order.repository";
import { paymentService } from "@/lib/services/payment.service";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", WEBHOOK_SECRET)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!WEBHOOK_SECRET) {
    logger.warn("Razorpay webhook secret not configured");
    return Response.json({ error: "Webhook not configured" }, { status: 500 });
  }

  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    logger.warn("Webhook signature verification failed");
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: {
    event: string;
    payload: {
      payment?: {
        entity: {
          id: string;
          order_id: string;
          status: string;
          notes?: Record<string, string>;
        };
      };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  await connectDB();

  const eventType = event.event;

  logger.info("Razorpay webhook received", { eventType });

  switch (eventType) {
    case "payment.captured": {
      const payment = event.payload.payment?.entity;
      if (!payment) break;

      const order = await orderRepository.findByRazorpayOrderId(payment.order_id);
      if (!order) {
        logger.warn("Webhook: order not found for payment", {
          paymentId: payment.id,
          orderId: payment.order_id,
        });
        break;
      }

      if (order.status === "paid") {
        logger.info("Webhook: order already marked paid", { orderId: order._id });
        break;
      }

      if (order.status === "pending") {
        try {
          await paymentService.fulfillFromWebhook(payment.order_id, payment.id);
          logger.info("Webhook: order fulfilled", {
            orderId: order._id,
            paymentId: payment.id,
          });
        } catch (err) {
          logger.error("Webhook: fulfillment failed", {
            orderId: order._id,
            paymentId: payment.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      audit({
        action: "webhook.payment_captured",
        userId: order.buyerId.toString(),
        resourceType: "order",
        resourceId: order._id.toString(),
        metadata: { paymentId: payment.id },
      });
      break;
    }

    case "payment.failed": {
      const payment = event.payload.payment?.entity;
      if (!payment) break;

      const order = await orderRepository.findByRazorpayOrderId(payment.order_id);
      if (!order || order.status !== "pending") break;

      await orderRepository.updateStatus(order._id.toString(), "failed", {
        razorpayPaymentId: payment.id,
        failureReason: "Payment failed (webhook)",
      });

      logger.info("Webhook: order marked failed", {
        orderId: order._id,
        paymentId: payment.id,
      });
      audit({
        action: "webhook.payment_failed",
        userId: order.buyerId.toString(),
        resourceType: "order",
        resourceId: order._id.toString(),
        metadata: { paymentId: payment.id },
      });
      break;
    }

    default:
      logger.info("Webhook: unhandled event type", { eventType });
  }

  return Response.json({ received: true });
}
