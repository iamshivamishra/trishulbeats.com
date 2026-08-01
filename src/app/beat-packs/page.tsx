import type { Metadata } from "next";
import BeatPacksClient from "@/app/beat-packs/BeatPacksClient";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

export const metadata: Metadata = {
  title: "Beat Packs",
  description: "Discover curated beat collections available for full-pack purchase.",
  alternates: { canonical: "/beat-packs" },
  openGraph: {
    title: "Beat Packs — Trishul Beats",
    description: "Discover curated beat collections available for full-pack purchase.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Beat Packs — Trishul Beats",
    description: "Discover curated beat collections available for full-pack purchase.",
  },
};

export const revalidate = 60;

export default async function BeatPacksPage() {
  const result = await beatPackRepository.listPublished(1, 24);

  // Batch: fetch all producers and beats in two queries instead of per-pack
  const uniqueProducerIds = [...new Set(result.data.map((p) => p.producerId.toString()))];
  const allBeatIds = [...new Set(result.data.flatMap((p) => p.beatIds.map((id) => id.toString())))];

  const [producers, allBeats] = await Promise.all([
    userRepository.findByIds(uniqueProducerIds),
    beatRepository.findByIds(allBeatIds),
  ]);

  const producerMap = new Map(producers.map((p) => [p._id.toString(), p]));
  const beatMap = new Map(allBeats.map((b) => [b._id.toString(), b]));

  const packs: BeatPackUi[] = result.data.map((pack) => {
    const producer = producerMap.get(pack.producerId.toString());
    const beats = pack.beatIds
      .map((id) => beatMap.get(id.toString()))
      .filter(Boolean) as typeof allBeats;

    return {
      id: pack._id.toString(),
      title: pack.title,
      description: pack.description || "",
      coverUrl: pack.coverUrl,
      imageUrls: pack.imageUrls || [],
      producerName: producer?.displayName || producer?.name || "",
      producerUsername: producer?.username || "",
      tags: pack.tags || [],
      beatCount: pack.beatIds.length,
      prices: [
        { tier: "basic", price: pack.prices.basic },
        { tier: "premium", price: pack.prices.premium },
        { tier: "unlimited", price: pack.prices.unlimited },
      ],
      tracks: beats.map((beat) => ({
        id: beat._id.toString(),
        title: beat.title,
        genre: beat.genre,
        bpm: beat.bpm,
        durationLabel: beat.duration ? `${Math.floor(beat.duration / 60)}:${String(beat.duration % 60).padStart(2, "0")}` : "—",
        previewUrl: beat.audioTaggedUrl,
      })),
      status: pack.status === "published" ? "published" : "draft",
      updatedAtLabel: `Updated ${new Date(pack.updatedAt).toLocaleDateString()}`,
    };
  });
  return <BeatPacksClient packs={packs} hasMore={result.hasNext} />;
}

