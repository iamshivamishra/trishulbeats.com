import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import BeatPackDetailClient from "@/app/beat-packs/[id]/BeatPackDetailClient";
import type { BeatPackUi, PurchasedTierInfo } from "@/features/beats/beat-pack-ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Beat Pack" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DashboardPackDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const pack = await beatPackService.getPackDetail(id).catch(() => null);
  if (!pack) notFound();

  const beatIdStrs = pack.beatIds.map((bid) => bid.toString());
  const ownershipFlags = await Promise.all(
    beatIdStrs.map((beatId) =>
      purchaseRepository.hasPurchased(session.user.id, beatId)
    )
  );

  const hasPurchasedAll =
    ownershipFlags.length > 0 && ownershipFlags.every(Boolean);
  const ownedBeatCount = ownershipFlags.filter(Boolean).length;

  let purchasedTier: PurchasedTierInfo | null = null;
  if (ownershipFlags.some(Boolean)) {
    const purchases = await purchaseRepository.findByBuyerAndBeatIds(
      session.user.id,
      beatIdStrs.filter((_, i) => ownershipFlags[i])
    );
    const first = purchases[0];
    if (first) {
      purchasedTier = {
        tier: first.licenseType as "basic" | "premium" | "unlimited",
        includesWav: first.includesWav ?? false,
        includesStems: first.includesStems ?? false,
      };
    }
  }

  const uiPack: BeatPackUi = {
    id: pack._id.toString(),
    title: pack.title,
    metadata: pack.metadata || "",
    description: pack.description || "",
    coverUrl: pack.coverUrl,
    imageUrls: pack.imageUrls || [],
    producerName: pack.producerName,
    producerUsername: pack.producerUsername || "",
    producerAvatarUrl: pack.producerAvatarUrl ?? undefined,
    tags: pack.tags || [],
    beatCount: pack.beatIds.length,
    prices: [
      { tier: "basic", price: pack.prices.basic },
      { tier: "premium", price: pack.prices.premium },
      { tier: "unlimited", price: pack.prices.unlimited },
    ],
    tracks: pack.beats.map((beat) => ({
      id: beat._id.toString(),
      title: beat.title,
      genre: beat.genre,
      bpm: beat.bpm,
      durationLabel: beat.duration
        ? `${Math.floor(beat.duration / 60)}:${String(beat.duration % 60).padStart(2, "0")}`
        : "—",
      previewUrl: beat.audioTaggedUrl,
    })),
    status: pack.status === "published" ? "published" : "draft",
    updatedAtLabel: `Updated ${new Date(pack.updatedAt).toLocaleDateString()}`,
  };

  return (
    <div className="page-shell max-w-5xl">
      <BeatPackDetailClient
        pack={uiPack}
        isLoggedIn
        hasPurchasedAll={hasPurchasedAll}
        ownedBeatCount={ownedBeatCount}
        purchasedTier={purchasedTier}
      />
    </div>
  );
}
