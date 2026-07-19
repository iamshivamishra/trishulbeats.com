import { describe, expect, it } from "vitest";
import { resolvePurchaseEntitlements } from "./entitlements";

describe("resolvePurchaseEntitlements", () => {
  it("denies WAV/stems when license is missing and no snapshot is present", () => {
    const result = resolvePurchaseEntitlements({}, null, "beat_1");

    expect(result.licenseMatchesBeat).toBe(false);
    expect(result.wavAllowed).toBe(false);
    expect(result.stemsAllowed).toBe(false);
  });

  it("uses purchase snapshot even when current license no longer matches", () => {
    const result = resolvePurchaseEntitlements(
      { includesWav: true, includesStems: false },
      {
        beatId: "beat_other",
        includesWav: false,
        includesStems: false,
        isActive: true,
      },
      "beat_1"
    );

    expect(result.licenseMatchesBeat).toBe(false);
    expect(result.wavAllowed).toBe(true);
    expect(result.stemsAllowed).toBe(false);
  });

  it("falls back to current active license when snapshot is absent", () => {
    const result = resolvePurchaseEntitlements(
      {},
      {
        beatId: "beat_1",
        includesWav: true,
        includesStems: true,
        isActive: true,
      },
      "beat_1"
    );

    expect(result.licenseMatchesBeat).toBe(true);
    expect(result.wavAllowed).toBe(true);
    expect(result.stemsAllowed).toBe(true);
  });
});
