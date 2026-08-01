import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import MyPacksClient, { type PackItem } from "./MyPacksClient";

export const metadata: Metadata = { title: "My Packs" };
export const dynamic = "force-dynamic";

export default async function MyPacksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { data: purchases } = await purchaseRepository.findByBuyerIdPaginated(
    session.user.id,
    1,
    200
  );

  const packPurchaseMap = new Map<
    string,
    { purchasedAt: Date; tier: string; beatCount: number; totalAmount: number }
  >();

  for (const purchase of purchases) {
    const packId = purchase.sourcePackId?.toString();
    if (!packId || purchase.sourceType !== "pack") continue;
    const existing = packPurchaseMap.get(packId);
    if (!existing) {
      packPurchaseMap.set(packId, {
        purchasedAt: purchase.createdAt,
        tier: purchase.licenseType,
        beatCount: 1,
        totalAmount: purchase.amount,
      });
      continue;
    }
    existing.beatCount += 1;
    existing.totalAmount += purchase.amount;
    if (purchase.createdAt < existing.purchasedAt) {
      existing.purchasedAt = purchase.createdAt;
    }
  }

  const packIds = Array.from(packPurchaseMap.keys());
  const packs = await beatPackRepository.findByIds(packIds);
  const packMap = new Map(packs.map((p) => [p._id.toString(), p]));

  const packBeatPurchases = purchases.filter(
    (p) => p.sourceType === "pack" && p.sourcePackId
  );

  const allBeatIds = packBeatPurchases.map((p) => p.beatId.toString());
  const beats = await beatRepository.findByIds(allBeatIds);
  const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

  const tierRank: Record<string, number> = { basic: 0, premium: 1, unlimited: 2 };

  const packItems: PackItem[] = Array.from(packPurchaseMap.entries())
    .map(([packId, info]) => {
      const pack = packMap.get(packId);

      const tracks = packBeatPurchases
        .filter((p) => p.sourcePackId?.toString() === packId)
        .map((p) => {
          const beat = beatMap.get(p.beatId.toString());
          return {
            beatId: p.beatId.toString(),
            title: beat?.title ?? "Unknown Beat",
            coverUrl: beat?.coverUrl || undefined,
          };
        });

      const currentRank = tierRank[info.tier] ?? 0;
      const currentTierPrice =
        pack?.prices?.[info.tier as keyof typeof pack.prices] ?? 0;
      const upgradeOptions = pack
        ? (["premium", "unlimited"] as const)
            .filter((t) => (tierRank[t] ?? 0) > currentRank)
            .map((t) => {
              const fullPrice = pack.prices?.[t] ?? 0;
              const feat = {
                basic: { wav: false, stems: false },
                premium: { wav: true, stems: false },
                unlimited: { wav: true, stems: true },
              }[t];
              const curr = {
                basic: { wav: false, stems: false },
                premium: { wav: true, stems: false },
                unlimited: { wav: true, stems: true },
              }[info.tier] ?? { wav: false, stems: false };
              const unlocks = [
                feat.wav && !curr.wav ? "+WAV" : "",
                feat.stems && !curr.stems ? "+Stems" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return {
                tier: t,
                fullPrice,
                upgradePrice: fullPrice - currentTierPrice,
                unlocks: unlocks || "Full upgrade",
              };
            })
            .filter((o) => o.upgradePrice > 0)
        : [];

      return {
        packId,
        title: pack?.title ?? "Beat Pack",
        imageUrl: pack?.imageUrls?.[0] || pack?.coverUrl || undefined,
        tier: info.tier,
        beatCount: info.beatCount,
        totalAmount: info.totalAmount,
        purchasedAt: info.purchasedAt.toISOString(),
        tracks,
        upgradeOptions,
      };
    })
    .sort(
      (a, b) =>
        new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime()
    );

  return (
    <div className="page-shell max-w-4xl">
      <MyPacksClient packs={packItems} />
    </div>
  );
}
