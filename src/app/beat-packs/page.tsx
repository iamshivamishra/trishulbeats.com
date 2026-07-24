import type { Metadata } from "next";
import BeatPacksClient from "@/app/beat-packs/BeatPacksClient";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

export const metadata: Metadata = {
  title: "Beat Packs",
  description: "Discover curated beat collections available for full-pack purchase.",
};

export const dynamic = "force-dynamic";

export default async function BeatPacksPage() {
  const result = await beatPackRepository.listPublished(1, 24);
  const packs: BeatPackUi[] = await Promise.all(
    result.data.map(async (pack) => {
      const [producer, beats] = await Promise.all([
        userRepository.findById(pack.producerId.toString()),
        beatRepository.findByIds(pack.beatIds.map((id) => id.toString())),
      ]);

      return {
        id: pack._id.toString(),
        title: pack.title,
        description: pack.description || "",
        coverUrl: pack.coverUrl,
        producerName: producer?.displayName || producer?.name || "Unknown Producer",
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
    })
  );
  return <BeatPacksClient packs={packs} hasMore={result.hasNext} />;
}

