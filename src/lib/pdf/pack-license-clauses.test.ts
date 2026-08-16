import { describe, expect, it } from "vitest";
import { getClauses } from "./pack-license-clauses";

describe("getClauses", () => {
  it("returns non-commercial usage for basic tier", () => {
    const clauses = getClauses("basic");
    expect(clauses.filesDelivered).toContain("MP3");
    expect(clauses.filesDelivered).not.toContain("WAV");
    expect(clauses.filesDelivered).not.toContain("STEMS");
    expect(clauses.usageRights.items[0]).toContain("Non-commercial");
    expect(
      clauses.restrictions.items.some((r) => r.includes("commercial purposes"))
    ).toBe(true);
  });

  it("returns WAV + commercial for premium tier", () => {
    const clauses = getClauses("premium");
    expect(clauses.filesDelivered).toContain("MP3");
    expect(clauses.filesDelivered).toContain("WAV");
    expect(clauses.filesDelivered).not.toContain("STEMS");
    expect(clauses.usageRights.items[0]).toContain("Full commercial");
    expect(clauses.usageRights.items).toEqual(
      expect.arrayContaining([expect.stringContaining("50,000")])
    );
  });

  it("returns WAV + STEMS + unlimited for unlimited tier", () => {
    const clauses = getClauses("unlimited");
    expect(clauses.filesDelivered).toContain("MP3");
    expect(clauses.filesDelivered).toContain("WAV");
    expect(clauses.filesDelivered).toContain("STEMS");
    expect(clauses.usageRights.items[0]).toContain("Full commercial");
    expect(clauses.usageRights.items).toEqual(
      expect.arrayContaining([expect.stringContaining("Unlimited streaming")])
    );
  });

  it("shares common clauses across all tiers", () => {
    const basic = getClauses("basic");
    const premium = getClauses("premium");
    const unlimited = getClauses("unlimited");

    expect(basic.royalties).toBe(premium.royalties);
    expect(premium.royalties).toBe(unlimited.royalties);
    expect(basic.credit).toBe(premium.credit);
    expect(basic.term).toContain("ninety-nine");
    expect(basic.refundPolicy).toContain("final");
    expect(basic.governingLaw).toContain("India");
  });

  it("adds extra restriction for basic tier only", () => {
    const basic = getClauses("basic");
    const premium = getClauses("premium");
    expect(basic.restrictions.items.length).toBeGreaterThan(
      premium.restrictions.items.length
    );
  });
});
