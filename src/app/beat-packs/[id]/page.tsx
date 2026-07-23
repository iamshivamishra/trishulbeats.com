import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BeatPackDetailClient from "@/app/beat-packs/[id]/BeatPackDetailClient";
import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const pack = await beatPackService.getPackDetail(id).catch(() => null);
  if (!pack) {
    return { title: "Beat Pack Not Found" };
  }

  return {
    title: `${pack.title} — Beat Pack`,
    description: pack.description,
  };
}

export default async function BeatPackDetailPage({ params }: Props) {
  const { id } = await params;
  const pack = await beatPackService.getPackDetail(id).catch(() => null);
  if (!pack) {
    notFound();
  }
  const session = await auth();
  const ownershipFlags = session?.user
    ? await Promise.all(
        pack.beatIds.map((beatId) => purchaseRepository.hasPurchased(session.user.id, beatId.toString()))
      )
    : [];
  const hasPurchasedAll = ownershipFlags.length > 0 && ownershipFlags.every(Boolean);
  const ownedBeatCount = ownershipFlags.filter(Boolean).length;

  const uiPack: BeatPackUi = {
    id: pack._id.toString(),
    title: pack.title,
    description: pack.description || "",
    coverUrl: pack.coverUrl,
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
    <BeatPackDetailClient
      pack={uiPack}
      isLoggedIn={!!session?.user}
      hasPurchasedAll={hasPurchasedAll}
      ownedBeatCount={ownedBeatCount}
    />
  );
}

