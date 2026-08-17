import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, ShoppingBag } from "lucide-react";
import { auth } from "@/lib/auth";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PackDownloadSection from "@/app/beat-packs/[id]/PackDownloadSection";
import type { PurchasedTierInfo } from "@/features/beats/beat-pack-ui";

export const metadata: Metadata = { title: "My Licenses" };
export const dynamic = "force-dynamic";

const TIER_RANK: Record<string, number> = { basic: 0, premium: 1, unlimited: 2 };
const TIER_FEATURES: Record<string, { wav: boolean; stems: boolean }> = {
  basic: { wav: false, stems: false },
  premium: { wav: true, stems: false },
  unlimited: { wav: true, stems: true },
};

export default async function MyLicensePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data: purchases } = await purchaseRepository.findByBuyerIdPaginated(
    session.user.id,
    1,
    200
  );

  // Group purchases by pack — same logic as MyPacksPage
  const packPurchaseMap = new Map<string, { tier: string }>();
  for (const purchase of purchases) {
    const packId = purchase.sourcePackId?.toString();
    if (!packId || purchase.sourceType !== "pack") continue;
    const existing = packPurchaseMap.get(packId);
    if (!existing) {
      packPurchaseMap.set(packId, { tier: purchase.licenseType });
    }
  }

  const packIds = Array.from(packPurchaseMap.keys());
  const packs = await beatPackRepository.findByIds(packIds);
  const packMap = new Map(packs.map((p) => [p._id.toString(), p]));

  const licenseCards = packIds.map((packId) => {
    const pack = packMap.get(packId);
    const info = packPurchaseMap.get(packId)!;
    const currentRank = TIER_RANK[info.tier] ?? 0;
    const currentFeatures = TIER_FEATURES[info.tier] ?? { wav: false, stems: false };
    const currentTierPrice = pack?.prices?.[info.tier as keyof typeof pack.prices] ?? 0;

    const purchasedTier: PurchasedTierInfo = {
      tier: info.tier as PurchasedTierInfo["tier"],
      includesWav: currentFeatures.wav,
      includesStems: currentFeatures.stems,
    };

    const upgradeOptions = pack
      ? (["premium", "unlimited"] as const)
          .filter((t) => (TIER_RANK[t] ?? 0) > currentRank)
          .map((t) => {
            const fullPrice = pack.prices?.[t] ?? 0;
            const features = TIER_FEATURES[t];
            return {
              tier: t,
              fullPrice,
              upgradePrice: fullPrice - currentTierPrice,
              features: { wav: features.wav, stems: features.stems, contentId: false },
            };
          })
          .filter((o) => o.upgradePrice > 0)
      : [];

    return {
      packId,
      title: pack?.title ?? "Beat Pack",
      purchasedTier,
      upgradeOptions,
    };
  });

  return (
    <div className="page-shell max-w-4xl">
      <h1 className="mb-6 flex items-center gap-2 text-2xl font-semibold">
        <FileText className="h-5 w-5 text-primary" />
        My Licenses
      </h1>

      {licenseCards.length > 0 ? (
        // Simple responsive grid, no `hidden` classes — shows on mobile and desktop.
        <div className="grid gap-6 sm:grid-cols-2">
          {licenseCards.map((item) => (
            <Card
              key={item.packId}
              className="rounded-2xl border-border/50 bg-card/80 shadow-sm overflow-hidden"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <Badge variant="outline" className="capitalize shrink-0">
                    {item.purchasedTier.tier}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <PackDownloadSection
                  packId={item.packId}
                  packTitle={item.title}
                  purchasedTier={item.purchasedTier}
                  upgradeOptions={item.upgradeOptions}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-sm">
          <CardContent className="flex flex-col items-center py-16">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No licenses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Purchase a beat pack to see your license details here.
            </p>
            <Button asChild variant="link" className="mt-3">
              <Link href="/beat-packs">Browse Beat Packs</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}