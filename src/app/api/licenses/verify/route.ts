import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { packLicenseRepository } from "@/lib/repositories/pack-license.repository";
import { computeLicenseHash } from "@/lib/license-hash";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 10,
      windowSec: 60,
      prefix: "api:license-verify",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const licenseNumber = request.nextUrl.searchParams.get("license");
    if (!licenseNumber) {
      return NextResponse.json(
        { error: "Missing 'license' query parameter" },
        { status: 400 }
      );
    }

    const cert = await packLicenseRepository.findByLicenseNumber(licenseNumber);
    if (!cert) {
      return NextResponse.json(
        { verified: false, reason: "License number not found" },
        { status: 404 }
      );
    }

    const expectedHash = computeLicenseHash({
      licenseNumber: cert.licenseNumber,
      buyerEmail: cert.buyerSnapshot.email,
      packId: cert.packId.toString(),
      licenseType: cert.licenseType,
      effectiveAt: cert.effectiveAt,
    });

    const storedHash = cert.verificationHash || "";
    let verified = false;

    if (storedHash.length === expectedHash.length && storedHash.length > 0) {
      verified = crypto.timingSafeEqual(
        Buffer.from(expectedHash, "hex"),
        Buffer.from(storedHash, "hex")
      );
    }

    audit({
      action: "license_certificate.verified",
      userId: session.user.id,
      resourceType: "pack_license_certificate",
      resourceId: cert._id.toString(),
      metadata: { licenseNumber, verified },
    });

    return NextResponse.json({
      verified,
      licenseNumber: cert.licenseNumber,
      tier: cert.licenseType,
      packTitle: cert.packSnapshot.title,
      buyerName: cert.buyerSnapshot.name,
      effectiveDate: cert.effectiveAt,
      issuedDate: cert.issuedAt,
      status: cert.status,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
