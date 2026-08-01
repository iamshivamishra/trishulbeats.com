import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    create: vi.fn(),
    attachRazorpayOrderId: vi.fn(),
    findByRazorpayOrderId: vi.fn(),
    findPendingByBuyerAndBeat: vi.fn(),
    findPendingByBuyerAndBeatIds: vi.fn(),
    markPaidIfPending: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
    findByBuyer: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    hasPurchased: vi.fn(),
    create: vi.fn(),
    findByBuyerAndBeat: vi.fn(),
    findByBuyerAndOrderId: vi.fn(),
    getPurchasedBeatIds: vi.fn(),
    findByBuyerId: vi.fn(),
    getEarningsByProducer: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    incrementSalesCount: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    incrementSalesCount: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/cart.repository", () => ({
  cartRepository: {
    clear: vi.fn(),
  },
}));

vi.mock("@/lib/services/cart.service", () => ({
  cartService: {
    getItems: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(async (operation: (session: unknown) => Promise<unknown>) =>
    operation({})),
}));

vi.mock("@/lib/razorpay", () => ({
  razorpay: {
    orders: {
      create: vi.fn(),
    },
  },
  verifySignature: vi.fn(),
  fetchPaymentById: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

import { ConflictError, ValidationError } from "@/lib/errors";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { fetchPaymentById, razorpay, verifySignature } from "@/lib/razorpay";
import { paymentService } from "./payment.service";

describe("paymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses an existing pending single-beat order instead of creating duplicate", async () => {
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(false);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({
      _id: "license_1",
      beatId: "beat_1",
      type: "basic",
      price: 499,
      isActive: true,
      includesWav: false,
      includesStems: false,
    } as never);
    vi.mocked(orderRepository.findPendingByBuyerAndBeat).mockResolvedValueOnce({
      _id: "order_existing",
      razorpayOrderId: "razorpay_existing",
      totalAmount: 499,
      items: [
        { beatId: "beat_1", licenseId: "license_1", licenseType: "basic", price: 499, beatTitle: "Test Beat" },
      ],
    } as never);

    const result = await paymentService.createOrder(
      { beatId: "beat_1", licenseId: "license_1" },
      "buyer_1"
    );

    expect(result).toEqual({
      orderId: "razorpay_existing",
      amount: 499,
      currency: "INR",
      internalOrderId: "order_existing",
    });
    expect(razorpay.orders.create).not.toHaveBeenCalled();
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("returns idempotent success for already-paid order", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce({
      _id: "order_1",
      buyerId: "buyer_1",
      status: "paid",
      razorpayPaymentId: "pay_1",
    } as never);
    vi.mocked(purchaseRepository.findByBuyerAndOrderId).mockResolvedValueOnce(
      [{ _id: "purchase_1" }] as never
    );

    const result = await paymentService.verifyAndRecord(
      {
        orderId: "rzp_order_1",
        paymentId: "pay_1",
        signature: "sig_1",
      },
      "buyer_1"
    );

    expect(result.order.status).toBe("paid");
    expect(result.purchases).toHaveLength(1);
    expect(orderRepository.markPaidIfPending).not.toHaveBeenCalled();
  });

  it("rejects when provider payment details do not match order", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce({
      _id: "order_2",
      buyerId: "buyer_1",
      status: "pending",
      totalAmount: 999,
    } as never);
    vi.mocked(verifySignature).mockReturnValueOnce(true);
    vi.mocked(fetchPaymentById).mockResolvedValueOnce({
      id: "pay_2",
      order_id: "rzp_order_2",
      status: "authorized",
      amount: 99900,
      currency: "INR",
    });

    await expect(
      paymentService.verifyAndRecord(
        {
          orderId: "rzp_order_1",
          paymentId: "pay_2",
          signature: "sig_2",
        },
        "buyer_1"
      )
    ).rejects.toBeInstanceOf(ValidationError);

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order_2",
      "failed",
      expect.objectContaining({
        razorpayPaymentId: "pay_2",
      })
    );
  });

  it("throws conflict when order belongs to another user", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce({
      _id: "order_3",
      buyerId: "buyer_2",
      status: "pending",
    } as never);

    await expect(
      paymentService.verifyAndRecord(
        {
          orderId: "rzp_order_3",
          paymentId: "pay_3",
          signature: "sig_3",
        },
        "buyer_1"
      )
    ).rejects.toBeInstanceOf(ConflictError);

    expect(verifySignature).not.toHaveBeenCalled();
    expect(beatRepository.incrementSalesCount).not.toHaveBeenCalled();
    expect(licenseRepository.findById).not.toHaveBeenCalled();
  });
});
