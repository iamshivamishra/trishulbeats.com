import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import BeatPackEditorForm from "@/features/studio/BeatPackEditorForm";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { storageService } from "@/lib/services/storage.service";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

interface Props {
  params: Promise<{ id: string }>;
}

export const metadata: Metadata = {
  title: "Studio — Edit Beat Pack",
};

export default async function EditBeatPackPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  const pack = await beatPackService.getById(id).catch(() => null);
  if (!pack) notFound();
  if (session.user.role !== "admin" && pack.producerId.toString() !== session.user.id) {
    notFound();
  }
  const beats = await beatRepository.findByIds(pack.beatIds.map((beatId) => beatId.toString()), true);

  // Fetch license prices for each beat
  const beatLicenses = await Promise.all(
    beats.map((beat) => licenseRepository.findByBeatId(beat._id.toString()))
  );
  const licensePriceMap = new Map(
    beats.map((beat, i) => {
      const licenses = beatLicenses[i];
      return [
        beat._id.toString(),
        {
          basic: licenses.find((l) => l.type === "basic")?.price,
          premium: licenses.find((l) => l.type === "premium")?.price,
          unlimited: licenses.find((l) => l.type === "unlimited")?.price,
        },
      ];
    })
  );

  const initialPack: BeatPackUi = {
    id: pack._id.toString(),
    title: pack.title,
    metadata: pack.metadata || "",
    description: pack.description || "",
    coverUrl: pack.coverUrl,
    imageUrls: pack.imageUrls || [],
    producerName: session.user.name || "Producer",
    producerUsername: "",
    tags: pack.tags || [],
    beatCount: pack.beatIds.length,
    prices: [
      { tier: "basic", price: pack.prices.basic },
      { tier: "premium", price: pack.prices.premium },
      { tier: "unlimited", price: pack.prices.unlimited },
    ],
    tracks: await Promise.all(
      beats.map(async (beat) => {
        const prices = licensePriceMap.get(beat._id.toString());
        const keys = beat.storageKeys;

        // Authenticated resources (master, stems) need signed URLs for preview
        let masterUrl = beat.audioFullUrl || "";
        let stemsUrl = beat.stemsUrl || "";
        if (keys?.master) {
          try { masterUrl = await storageService.getDownloadUrl(keys.master, { expiresInSeconds: 3600 }); } catch { /* keep raw URL */ }
        }
        if (keys?.stems) {
          try { stemsUrl = await storageService.getDownloadUrl(keys.stems, { expiresInSeconds: 3600 }); } catch { /* keep raw URL */ }
        }

        return {
          id: beat._id.toString(),
          title: beat.title,
          description: beat.description || "",
          genre: beat.genre,
          bpm: beat.bpm,
          key: beat.key || "",
          mood: beat.mood || "",
          tags: beat.tags || [],
          priceBasic: prices?.basic,
          pricePremium: prices?.premium,
          priceUnlimited: prices?.unlimited,
          durationLabel: beat.duration
            ? `${Math.floor(beat.duration / 60)}:${String(beat.duration % 60).padStart(2, "0")}`
            : "—",
          previewUrl: beat.audioTaggedUrl || "",
          masterUrl,
          stemsUrl,
          coverUrl: beat.coverUrl || "",
        };
      })
    ),
    status: pack.status === "published" ? "published" : "draft",
    updatedAtLabel: `Updated ${new Date(pack.updatedAt).toLocaleDateString()}`,
  };

  return <BeatPackEditorForm mode="edit" initialPack={initialPack} producerId={session.user.id} />;
}

