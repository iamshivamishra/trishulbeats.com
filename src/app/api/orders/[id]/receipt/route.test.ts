import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/errors", () => {
  class UnauthorizedError extends Error {
    statusCode = 401;
  }
  class NotFoundError extends Error {
    statusCode = 404;
    constructor(msg = "Not found") {
      super(msg);
    }
  }
  class ForbiddenError extends Error {
    statusCode = 403;
  }
  return {
    UnauthorizedError,
    NotFoundError,
    ForbiddenError,
    formatErrorResponse: (error: unknown) => {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
      const message = error instanceof Error ? error.message : "Request failed";
      return Response.json({ error: message }, { status: statusCode });
    },
  };
});

import { auth } from "@/lib/auth";
import { orderRepository } from "@/lib/repositories/order.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { GET } from "./route";

const mockOrder = {
  _id: "order1",
  buyerId: { toString: () => "buyer1" },
  status: "paid",
  receipt: "rcpt_test_123",
  totalAmount: 1499,
  paidAt: new Date("2026-07-01"),
  createdAt: new Date("2026-07-01"),
  razorpayPaymentId: "pay_abc123",
  items: [
    {
      beatId: "beat1",
      beatTitle: "Night Drive",
      licenseType: "premium",
      price: 1499,
      sourceType: "beat",
    },
  ],
};

const mockBuyer = {
  _id: "buyer1",
  name: "Test User",
  displayName: "Test User",
  email: "test@example.com",
};

function mockRequest(): NextRequest {
  return {} as NextRequest;
}

function mockParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("GET /api/orders/[id]/receipt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a PDF receipt for a paid order", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "buyer1", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    } as never);
    vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as never);
    vi.mocked(userRepository.findById).mockResolvedValue(mockBuyer as never);

    const response = await GET(mockRequest(), mockParams("order1"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("receipt-rcpt_test_123.pdf");

    const body = await response.arrayBuffer();
    const pdfHeader = new TextDecoder().decode(new Uint8Array(body).slice(0, 5));
    expect(pdfHeader).toBe("%PDF-");
  });

  it("rejects unauthenticated requests", async () => {
    vi.mocked(auth).mockResolvedValue(null as never);

    const response = await GET(mockRequest(), mockParams("order1"));
    expect(response.status).toBe(401);
  });

  it("returns 404 for nonexistent order", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "buyer1", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    } as never);
    vi.mocked(orderRepository.findById).mockResolvedValue(null);

    const response = await GET(mockRequest(), mockParams("order1"));
    expect(response.status).toBe(404);
  });

  it("returns 403 when buyer does not own the order", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "other_user", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    } as never);
    vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder as never);

    const response = await GET(mockRequest(), mockParams("order1"));
    expect(response.status).toBe(403);
  });

  it("returns 400 for unpaid order", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "buyer1", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    } as never);
    vi.mocked(orderRepository.findById).mockResolvedValue({
      ...mockOrder,
      status: "pending",
    } as never);

    const response = await GET(mockRequest(), mockParams("order1"));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("only available for paid orders");
  });

  it("generates PDF with multiple items", async () => {
    const multiItemOrder = {
      ...mockOrder,
      totalAmount: 2998,
      items: [
        { beatId: "b1", beatTitle: "Beat One", licenseType: "premium", price: 1499, sourceType: "pack" },
        { beatId: "b2", beatTitle: "Beat Two", licenseType: "premium", price: 1499, sourceType: "pack" },
      ],
    };

    vi.mocked(auth).mockResolvedValue({
      user: { id: "buyer1", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    } as never);
    vi.mocked(orderRepository.findById).mockResolvedValue(multiItemOrder as never);
    vi.mocked(userRepository.findById).mockResolvedValue(mockBuyer as never);

    const response = await GET(mockRequest(), mockParams("order1"));
    expect(response.status).toBe(200);

    const body = await response.arrayBuffer();
    expect(body.byteLength).toBeGreaterThan(1000);
  });

  it("writes sample receipt PDF to disk for visual inspection", async () => {
    const multiItemOrder = {
      ...mockOrder,
      totalAmount: 4497,
      razorpayPaymentId: "pay_RzpSample123",
      items: [
        { beatId: "b1", beatTitle: "Night Drive", licenseType: "premium", price: 1499, sourceType: "beat" },
        { beatId: "b2", beatTitle: "Midnight Raga", licenseType: "basic", price: 499, sourceType: "pack" },
        { beatId: "b3", beatTitle: "Tabla Fusion", licenseType: "unlimited", price: 2499, sourceType: "pack" },
      ],
    };

    vi.mocked(auth).mockResolvedValue({
      user: { id: "buyer1", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    } as never);
    vi.mocked(orderRepository.findById).mockResolvedValue(multiItemOrder as never);
    vi.mocked(userRepository.findById).mockResolvedValue(mockBuyer as never);

    const response = await GET(mockRequest(), mockParams("order1"));
    expect(response.status).toBe(200);

    const body = await response.arrayBuffer();
    const buffer = Buffer.from(body);

    const outDir = path.join(process.cwd(), "test-output");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const filePath = path.join(outDir, "receipt-sample.pdf");
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.statSync(filePath).size).toBeGreaterThan(1000);
  });

  it("writes sample receipt PDF with coupon discount to disk", async () => {
    const couponOrder = {
      ...mockOrder,
      subtotalAmount: 4497,
      discountAmount: 500,
      couponCode: "BEATS20",
      totalAmount: 3997,
      razorpayPaymentId: "pay_RzpCoupon456",
      items: [
        { beatId: "b1", beatTitle: "Night Drive", licenseType: "premium", price: 1499, sourceType: "beat" },
        { beatId: "b2", beatTitle: "Midnight Raga", licenseType: "basic", price: 499, sourceType: "pack" },
        { beatId: "b3", beatTitle: "Tabla Fusion", licenseType: "unlimited", price: 2499, sourceType: "pack" },
      ],
    };

    vi.mocked(auth).mockResolvedValue({
      user: { id: "buyer1", role: "buyer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    } as never);
    vi.mocked(orderRepository.findById).mockResolvedValue(couponOrder as never);
    vi.mocked(userRepository.findById).mockResolvedValue(mockBuyer as never);

    const response = await GET(mockRequest(), mockParams("order1"));
    expect(response.status).toBe(200);

    const body = await response.arrayBuffer();
    const buffer = Buffer.from(body);
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");

    const outDir = path.join(process.cwd(), "test-output");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const filePath = path.join(outDir, "receipt-with-coupon.pdf");
    fs.writeFileSync(filePath, buffer);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(fs.statSync(filePath).size).toBeGreaterThan(1000);
  });
});
