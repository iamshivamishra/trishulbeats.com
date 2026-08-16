import { describe, expect, it } from "vitest";
import { generatePackLicensePdf, type LicensePdfInput } from "./pack-license-pdf";
import fs from "fs";
import path from "path";

const SAMPLE_HASH = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

const BASE_INPUT: LicensePdfInput = {
  licenseNumber: "TB-LIC-2026-A1B2C3D4E5F6",
  packTitle: "Indian Beat Collection",
  tier: "unlimited",
  buyerName: "Sandeep Mishra",
  buyerEmail: "sandeep@example.com",
  beatTitles: [
    "Midnight Raga",
    "Tabla Fusion",
    "Desi Trap Anthem",
    "Sitar Dreams",
    "Bollywood Underground",
  ],
  amountPaid: 9999,
  effectiveDate: new Date("2026-08-16"),
  issuedDate: new Date("2026-08-16"),
  receiptNumber: "rcpt_test_abc123",
  verificationHash: SAMPLE_HASH,
};

describe("generatePackLicensePdf", () => {
  it("generates a valid PDF buffer for unlimited tier", async () => {
    const buffer = await generatePackLicensePdf(BASE_INPUT);
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("generates a valid PDF for basic tier", async () => {
    const buffer = await generatePackLicensePdf({
      ...BASE_INPUT,
      tier: "basic",
      amountPaid: 499,
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("generates a valid PDF for premium tier", async () => {
    const buffer = await generatePackLicensePdf({
      ...BASE_INPUT,
      tier: "premium",
      amountPaid: 1499,
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("generates a valid PDF with upgrade appendix", async () => {
    const buffer = await generatePackLicensePdf({
      ...BASE_INPUT,
      tier: "unlimited",
      supersedes: {
        licenseNumber: "TB-LIC-2026-OLDOLDOLDOLD",
        previousTier: "premium",
        issuedDate: new Date("2026-06-01"),
      },
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it("handles a large track list without crashing", async () => {
    const manyTracks = Array.from({ length: 50 }, (_, i) => `Beat Track ${i + 1}`);
    const buffer = await generatePackLicensePdf({
      ...BASE_INPUT,
      beatTitles: manyTracks,
    });
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("writes sample PDFs to disk for visual inspection", async () => {
    const outDir = path.join(process.cwd(), "test-output");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const variants: { name: string; input: LicensePdfInput }[] = [
      { name: "license-basic", input: { ...BASE_INPUT, tier: "basic", amountPaid: 499 } },
      { name: "license-premium", input: { ...BASE_INPUT, tier: "premium", amountPaid: 1499 } },
      { name: "license-unlimited", input: { ...BASE_INPUT, tier: "unlimited", amountPaid: 9999 } },
      {
        name: "license-upgrade",
        input: {
          ...BASE_INPUT,
          tier: "unlimited",
          amountPaid: 8500,
          supersedes: {
            licenseNumber: "TB-LIC-2026-PREV12345678",
            previousTier: "premium",
            issuedDate: new Date("2026-06-01"),
          },
        },
      },
    ];

    for (const { name, input } of variants) {
      const buffer = await generatePackLicensePdf(input);
      const filePath = path.join(outDir, `${name}.pdf`);
      fs.writeFileSync(filePath, buffer);
      expect(fs.existsSync(filePath)).toBe(true);
      const stat = fs.statSync(filePath);
      expect(stat.size).toBeGreaterThan(1000);
    }
  });
});
