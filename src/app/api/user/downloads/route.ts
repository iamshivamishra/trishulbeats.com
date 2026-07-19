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

    const downloads = await Promise.all(
      purchases.map(async (purchase) => {
        const beat = await beatRepository.findById(purchase.beatId.toString());
        const license = await licenseRepository.findById(
          purchase.licenseId.toString()
        );
        const beatId = purchase.beatId.toString();
        const entitlements = resolvePurchaseEntitlements(purchase, license, beatId);

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
      })
    );

    return Response.json({ downloads });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
