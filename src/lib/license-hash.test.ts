import { describe, expect, it, beforeEach, vi } from "vitest";

// Set env before importing the module
beforeEach(() => {
  vi.stubEnv("LICENSE_HMAC_SECRET", "test-secret-for-license-hashing");
});

import { computeLicenseHash, verifyLicenseHash } from "./license-hash";

const FIELDS = {
  licenseNumber: "TB-LIC-2026-ABCDEF123456",
  buyerEmail: "buyer@example.com",
  packId: "64a1b2c3d4e5f6789abcdef0",
  licenseType: "premium",
  effectiveAt: new Date("2026-08-16T00:00:00.000Z"),
};

describe("computeLicenseHash", () => {
  it("returns a 64-char hex string (SHA-256)", () => {
    const hash = computeLicenseHash(FIELDS);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic — same inputs produce the same hash", () => {
    const a = computeLicenseHash(FIELDS);
    const b = computeLicenseHash(FIELDS);
    expect(a).toBe(b);
  });

  it("changes when any field changes", () => {
    const base = computeLicenseHash(FIELDS);

    const differentEmail = computeLicenseHash({
      ...FIELDS,
      buyerEmail: "other@example.com",
    });
    expect(differentEmail).not.toBe(base);

    const differentTier = computeLicenseHash({
      ...FIELDS,
      licenseType: "basic",
    });
    expect(differentTier).not.toBe(base);

    const differentDate = computeLicenseHash({
      ...FIELDS,
      effectiveAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    expect(differentDate).not.toBe(base);

    const differentLicense = computeLicenseHash({
      ...FIELDS,
      licenseNumber: "TB-LIC-2026-DIFFERENT123",
    });
    expect(differentLicense).not.toBe(base);
  });

  it("normalises email case", () => {
    const lower = computeLicenseHash(FIELDS);
    const upper = computeLicenseHash({
      ...FIELDS,
      buyerEmail: "BUYER@EXAMPLE.COM",
    });
    expect(lower).toBe(upper);
  });
});

describe("verifyLicenseHash", () => {
  it("returns true for a correct hash", () => {
    const hash = computeLicenseHash(FIELDS);
    expect(verifyLicenseHash(FIELDS, hash)).toBe(true);
  });

  it("returns false for a tampered hash", () => {
    const hash = computeLicenseHash(FIELDS);
    const tampered = "a".repeat(64);
    expect(verifyLicenseHash(FIELDS, tampered)).toBe(false);
  });

  it("returns false for wrong-length input", () => {
    expect(verifyLicenseHash(FIELDS, "short")).toBe(false);
  });

  it("returns false when fields differ from original", () => {
    const hash = computeLicenseHash(FIELDS);
    const altered = { ...FIELDS, buyerEmail: "hacker@evil.com" };
    expect(verifyLicenseHash(altered, hash)).toBe(false);
  });
});
