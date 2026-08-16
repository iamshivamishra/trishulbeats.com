import { describe, it, expect } from "vitest";
import {
  createOrderSchema,
  createPackOrderSchema,
  checkoutCartSchema,
  checkoutCombinedSchema,
  verifyPaymentSchema,
  createUpgradeOrderSchema,
  failOrderSchema,
} from "./payment";

const validObjectId = "507f1f77bcf86cd799439011";

describe("createOrderSchema", () => {
  it("accepts valid ObjectIds", () => {
    const result = createOrderSchema.safeParse({ beatId: validObjectId, licenseId: validObjectId });
    expect(result.success).toBe(true);
  });

  it("rejects invalid beatId format", () => {
    const result = createOrderSchema.safeParse({ beatId: "not-an-id", licenseId: validObjectId });
    expect(result.success).toBe(false);
  });

  it("rejects invalid licenseId format", () => {
    const result = createOrderSchema.safeParse({ beatId: validObjectId, licenseId: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(createOrderSchema.safeParse({}).success).toBe(false);
    expect(createOrderSchema.safeParse({ beatId: validObjectId }).success).toBe(false);
  });
});

describe("createPackOrderSchema", () => {
  it("accepts valid input", () => {
    const result = createPackOrderSchema.safeParse({ packId: validObjectId, tier: "premium" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid tier", () => {
    const result = createPackOrderSchema.safeParse({ packId: validObjectId, tier: "free" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid packId", () => {
    const result = createPackOrderSchema.safeParse({ packId: "bad", tier: "basic" });
    expect(result.success).toBe(false);
  });
});

describe("checkoutCartSchema", () => {
  it("accepts fromCart true", () => {
    const result = checkoutCartSchema.safeParse({ fromCart: true });
    expect(result.success).toBe(true);
  });

  it("rejects fromCart false", () => {
    const result = checkoutCartSchema.safeParse({ fromCart: false });
    expect(result.success).toBe(false);
  });
});

describe("checkoutCombinedSchema", () => {
  it("accepts both flags true", () => {
    const result = checkoutCombinedSchema.safeParse({ fromCart: true, includePackCart: true });
    expect(result.success).toBe(true);
  });

  it("rejects missing includePackCart", () => {
    const result = checkoutCombinedSchema.safeParse({ fromCart: true });
    expect(result.success).toBe(false);
  });
});

describe("verifyPaymentSchema", () => {
  it("accepts valid input", () => {
    const result = verifyPaymentSchema.safeParse({
      orderId: "order_123",
      paymentId: "pay_456",
      signature: "sig_789",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty orderId", () => {
    const result = verifyPaymentSchema.safeParse({
      orderId: "",
      paymentId: "pay_456",
      signature: "sig_789",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    expect(verifyPaymentSchema.safeParse({}).success).toBe(false);
    expect(verifyPaymentSchema.safeParse({ orderId: "o1" }).success).toBe(false);
  });
});

describe("createUpgradeOrderSchema", () => {
  it("accepts valid upgrade to premium", () => {
    const result = createUpgradeOrderSchema.safeParse({ packId: validObjectId, targetTier: "premium" });
    expect(result.success).toBe(true);
  });

  it("accepts valid upgrade to unlimited", () => {
    const result = createUpgradeOrderSchema.safeParse({ packId: validObjectId, targetTier: "unlimited" });
    expect(result.success).toBe(true);
  });

  it("rejects basic as target tier", () => {
    const result = createUpgradeOrderSchema.safeParse({ packId: validObjectId, targetTier: "basic" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid packId", () => {
    const result = createUpgradeOrderSchema.safeParse({ packId: "bad", targetTier: "premium" });
    expect(result.success).toBe(false);
  });
});

describe("failOrderSchema", () => {
  it("accepts valid input", () => {
    const result = failOrderSchema.safeParse({ orderId: "order_123" });
    expect(result.success).toBe(true);
  });

  it("provides default reason", () => {
    const result = failOrderSchema.parse({ orderId: "order_123" });
    expect(result.reason).toBe("Payment cancelled by user");
  });

  it("accepts custom reason", () => {
    const result = failOrderSchema.parse({ orderId: "order_123", reason: "Timeout" });
    expect(result.reason).toBe("Timeout");
  });

  it("rejects empty orderId", () => {
    const result = failOrderSchema.safeParse({ orderId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects reason over 500 chars", () => {
    const result = failOrderSchema.safeParse({ orderId: "o1", reason: "x".repeat(501) });
    expect(result.success).toBe(false);
  });
});
