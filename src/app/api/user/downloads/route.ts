import { auth } from "@/lib/auth";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { resolvePurchaseEntitlements } from "@/lib/security/entitlements";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

/**
 * GET /api/user/downloads
 *
 * Returns all purchased beats with their download endpoint URLs.
 * Does not generate signed URLs upfront — the client fetches individual
 * signed URLs on demand via /api/beats/[id]/download.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const purchases = await purchaseRepository.findByBuyerId(session.user.id);

    const beatIds = [...new Set(purchases.map((p) => p.beatId.toString()))];
    const licenseIds = [...new Set(purchases.map((p) => p.licenseId.toString()))];

    const [beats, licenses] = await Promise.all([
      beatRepository.findByIds(beatIds),
      licenseRepository.findByIds(licenseIds),
    ]);

    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));
    const licenseMap = new Map(licenses.map((l) => [l._id.toString(), l]));

    const downloads = purchases.map((purchase) => {
      const beatId = purchase.beatId.toString();
      const beat = beatMap.get(beatId);
      const license = licenseMap.get(purchase.licenseId.toString());
      const entitlements = resolvePurchaseEntitlements(purchase, license ?? null, beatId);

      return {
        purchaseId: purchase._id.toString(),
        beatId,
        beatTitle: beat?.title || "Unknown",
        beatCoverUrl: beat?.coverUrl,
        beatGenre: beat?.genre || "",
        licenseType: purchase.licenseType,
        licenseName: license?.name || purchase.licenseType,
        includesWav: entitlements.wavAllowed,
        includesStems: entitlements.stemsAllowed,
        hasStemsFile: !!beat?.stemsUrl,
        amount: purchase.amount,
        purchasedAt: purchase.createdAt,
      };
    });

    return Response.json({ downloads });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
