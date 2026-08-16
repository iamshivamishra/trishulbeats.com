import { describe, it, expect } from "vitest";
import {
  createLicenseSchema,
  updateLicenseSchema,
  LICENSE_TYPES,
  LICENSE_DEFAULTS,
} from "./license";

describe("createLicenseSchema", () => {
  const validInput = {
    beatId: "abc123",
    type: "basic" as const,
    price: 499,
    terms: "This is a valid license terms string.",
  };

  it("accepts valid input", () => {
    const result = createLicenseSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("applies defaults for boolean fields", () => {
    const result = createLicenseSchema.parse(validInput);
    expect(result.includesWav).toBe(false);
    expect(result.includesStems).toBe(false);
    expect(result.commercialUse).toBe(false);
    expect(result.streamLimit).toBe(5000);
  });

  it("rejects missing beatId", () => {
    const { beatId: _, ...rest } = validInput;
    const result = createLicenseSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = createLicenseSchema.safeParse({ ...validInput, type: "free" });
    expect(result.success).toBe(false);
  });

  it("rejects price below 1", () => {
    const result = createLicenseSchema.safeParse({ ...validInput, price: 0 });
    expect(result.success).toBe(false);
  });

  it("rejects terms shorter than 10 chars", () => {
    const result = createLicenseSchema.safeParse({ ...validInput, terms: "Short" });
    expect(result.success).toBe(false);
  });

  it("rejects terms longer than 1000 chars", () => {
    const result = createLicenseSchema.safeParse({ ...validInput, terms: "x".repeat(1001) });
    expect(result.success).toBe(false);
  });

  it("allows streamLimit of -1 (unlimited)", () => {
    const result = createLicenseSchema.safeParse({ ...validInput, streamLimit: -1 });
    expect(result.success).toBe(true);
  });

  it("coerces price from string", () => {
    const result = createLicenseSchema.parse({ ...validInput, price: "999" });
    expect(result.price).toBe(999);
  });
});

describe("updateLicenseSchema", () => {
  it("accepts empty object", () => {
    const result = updateLicenseSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial update", () => {
    const result = updateLicenseSchema.safeParse({ price: 799, includesWav: true });
    expect(result.success).toBe(true);
  });

  it("rejects price below 1", () => {
    const result = updateLicenseSchema.safeParse({ price: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts isActive toggle", () => {
    const result = updateLicenseSchema.safeParse({ isActive: false });
    expect(result.success).toBe(true);
  });
});

describe("LICENSE_TYPES", () => {
  it("contains basic, premium, unlimited", () => {
    expect(LICENSE_TYPES).toEqual(["basic", "premium", "unlimited"]);
  });
});

describe("LICENSE_DEFAULTS", () => {
  it("has entries for all license types", () => {
    for (const type of LICENSE_TYPES) {
      expect(LICENSE_DEFAULTS[type]).toBeDefined();
      expect(LICENSE_DEFAULTS[type].name).toBeTruthy();
      expect(LICENSE_DEFAULTS[type].price).toBeGreaterThan(0);
      expect(typeof LICENSE_DEFAULTS[type].terms).toBe("string");
    }
  });

  it("basic does not include WAV or stems", () => {
    expect(LICENSE_DEFAULTS.basic.includesWav).toBe(false);
    expect(LICENSE_DEFAULTS.basic.includesStems).toBe(false);
  });

  it("premium includes WAV but not stems", () => {
    expect(LICENSE_DEFAULTS.premium.includesWav).toBe(true);
    expect(LICENSE_DEFAULTS.premium.includesStems).toBe(false);
  });

  it("unlimited includes WAV and stems", () => {
    expect(LICENSE_DEFAULTS.unlimited.includesWav).toBe(true);
    expect(LICENSE_DEFAULTS.unlimited.includesStems).toBe(true);
  });

  it("prices increase from basic to unlimited", () => {
    expect(LICENSE_DEFAULTS.basic.price).toBeLessThan(LICENSE_DEFAULTS.premium.price);
    expect(LICENSE_DEFAULTS.premium.price).toBeLessThan(LICENSE_DEFAULTS.unlimited.price);
  });
});
