import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/models/Order", () => ({
  default: {
    create: vi.fn(),
    findById: vi.fn(),
    findOne: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findOneAndUpdate: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
  },
}));

import Order from "@/lib/models/Order";
import { orderRepository } from "./order.repository";

function chainable(result: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn().mockReturnValue(chain);
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.skip = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.session = vi.fn().mockReturnValue(chain);
  chain.populate = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  chain.then = vi.fn((resolve: (v: unknown) => void) => resolve(result));
  return chain;
}

const mockOrder = {
  _id: "order1",
  buyerId: "buyer1",
  status: "pending",
  items: [{ beatId: "beat1" }],
  totalAmount: 999,
};

describe("orderRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("returns created order", async () => {
      vi.mocked(Order.create).mockResolvedValue([
        { toObject: () => mockOrder },
      ] as never);

      const result = await orderRepository.create({ buyerId: "buyer1" });

      expect(result).toEqual(mockOrder);
      expect(Order.create).toHaveBeenCalledWith(
        [{ buyerId: "buyer1" }],
        { session: undefined }
      );
    });
  });

  describe("findById", () => {
    it("returns order by id", async () => {
      vi.mocked(Order.findById).mockReturnValue(chainable(mockOrder) as never);

      const result = await orderRepository.findById("order1");

      expect(result).toEqual(mockOrder);
      expect(Order.findById).toHaveBeenCalledWith("order1");
    });
  });

  describe("findByRazorpayOrderId", () => {
    it("finds by razorpayOrderId field", async () => {
      vi.mocked(Order.findOne).mockReturnValue(chainable(mockOrder) as never);

      const result = await orderRepository.findByRazorpayOrderId("rpay_123");

      expect(result).toEqual(mockOrder);
      expect(Order.findOne).toHaveBeenCalledWith({ razorpayOrderId: "rpay_123" });
    });
  });

  describe("updateStatus", () => {
    it("calls findByIdAndUpdate with status", async () => {
      vi.mocked(Order.findByIdAndUpdate).mockReturnValue(
        chainable({ ...mockOrder, status: "paid" }) as never
      );

      const result = await orderRepository.updateStatus("order1", "paid");

      expect(result).toEqual({ ...mockOrder, status: "paid" });
      expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
        "order1",
        { status: "paid" },
        { new: true, session: undefined }
      );
    });
  });

  describe("markPaidIfPending", () => {
    it("filters by status pending and updates to paid", async () => {
      const paidOrder = { ...mockOrder, status: "paid" };
      vi.mocked(Order.findOneAndUpdate).mockReturnValue(chainable(paidOrder) as never);

      const paymentData = {
        razorpayPaymentId: "pay_123",
        paidAt: new Date("2024-01-01"),
      };
      const result = await orderRepository.markPaidIfPending("order1", paymentData);

      expect(result).toEqual(paidOrder);
      expect(Order.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: "order1", status: "pending" },
        { status: "paid", ...paymentData },
        { new: true, session: undefined }
      );
    });
  });

  describe("findByBuyer", () => {
    it("returns orders for buyer", async () => {
      vi.mocked(Order.find).mockReturnValue(chainable([mockOrder]) as never);

      const result = await orderRepository.findByBuyer("buyer1");

      expect(result).toEqual([mockOrder]);
      expect(Order.find).toHaveBeenCalledWith({ buyerId: "buyer1" });
    });

    it("filters by status when provided", async () => {
      vi.mocked(Order.find).mockReturnValue(chainable([mockOrder]) as never);

      await orderRepository.findByBuyer("buyer1", "paid");

      expect(Order.find).toHaveBeenCalledWith({ buyerId: "buyer1", status: "paid" });
    });
  });

  describe("countByBuyer", () => {
    it("counts paid orders for buyer", async () => {
      vi.mocked(Order.countDocuments).mockReturnValue(chainable(5) as never);

      const result = await orderRepository.countByBuyer("buyer1");

      expect(result).toBe(5);
      expect(Order.countDocuments).toHaveBeenCalledWith({
        buyerId: "buyer1",
        status: "paid",
      });
    });
  });

  describe("attachRazorpayOrderId", () => {
    it("updates order with razorpay id", async () => {
      vi.mocked(Order.findByIdAndUpdate).mockReturnValue(
        chainable({ ...mockOrder, razorpayOrderId: "rpay_456" }) as never
      );

      const result = await orderRepository.attachRazorpayOrderId("order1", "rpay_456");

      expect(result).toEqual({ ...mockOrder, razorpayOrderId: "rpay_456" });
      expect(Order.findByIdAndUpdate).toHaveBeenCalledWith(
        "order1",
        { razorpayOrderId: "rpay_456" },
        { new: true, session: undefined }
      );
    });
  });

  describe("findPendingByBuyerAndBeat", () => {
    it("finds pending order by buyer and beat", async () => {
      vi.mocked(Order.findOne).mockReturnValue(chainable(mockOrder) as never);

      const result = await orderRepository.findPendingByBuyerAndBeat("buyer1", "beat1");

      expect(result).toEqual(mockOrder);
      expect(Order.findOne).toHaveBeenCalledWith({
        buyerId: "buyer1",
        status: "pending",
        "items.beatId": "beat1",
      });
    });
  });

  describe("findPendingByBuyerAndBeatIds", () => {
    it("finds pending order matching any beat id", async () => {
      vi.mocked(Order.findOne).mockReturnValue(chainable(mockOrder) as never);

      const result = await orderRepository.findPendingByBuyerAndBeatIds("buyer1", ["beat1", "beat2"]);

      expect(result).toEqual(mockOrder);
      expect(Order.findOne).toHaveBeenCalledWith({
        buyerId: "buyer1",
        status: "pending",
        "items.beatId": { $in: ["beat1", "beat2"] },
      });
    });

    it("returns null for empty beatIds array", async () => {
      const result = await orderRepository.findPendingByBuyerAndBeatIds("buyer1", []);

      expect(result).toBeNull();
      expect(Order.findOne).not.toHaveBeenCalled();
    });
  });
});
