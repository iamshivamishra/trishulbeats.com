import crypto from "crypto";

function getSecret(): string {
  const secret =
    process.env.LICENSE_HMAC_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "LICENSE_HMAC_SECRET or JWT_SECRET must be set for license verification"
    );
  }
  return secret;
}

interface LicenseHashFields {
  licenseNumber: string;
  buyerEmail: string;
  packId: string;
  licenseType: string;
  effectiveAt: Date;
}

/**
 * Deterministic canonical payload: pipe-delimited fields in fixed order.
 * Changing any field changes the hash, making tampering detectable.
 */
function canonicalize(fields: LicenseHashFields): string {
  return [
    fields.licenseNumber,
    fields.buyerEmail.toLowerCase().trim(),
    fields.packId.toString(),
    fields.licenseType,
    fields.effectiveAt.toISOString(),
  ].join("|");
}

export function computeLicenseHash(fields: LicenseHashFields): string {
  const payload = canonicalize(fields);
  return crypto
    .createHmac("sha256", getSecret())
    .update(payload)
    .digest("hex");
}

export function verifyLicenseHash(
  fields: LicenseHashFields,
  hash: string
): boolean {
  const expected = computeLicenseHash(fields);
  if (expected.length !== hash.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(hash, "hex")
  );
}
