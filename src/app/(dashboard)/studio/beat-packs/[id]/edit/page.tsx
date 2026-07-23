import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import BeatPackEditorForm from "@/features/studio/BeatPackEditorForm";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { beatRepository } from "@/lib/repositories/beat.repository";
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
  const beats = await beatRepository.findByIds(pack.beatIds.map((beatId) => beatId.toString()));

  const initialPack: BeatPackUi = {
    id: pack._id.toString(),
    title: pack.title,
    description: pack.description || "",
    coverUrl: pack.coverUrl,
    producerName: session.user.name || "Producer",
    producerUsername: "",
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
      durationLabel: beat.duration
        ? `${Math.floor(beat.duration / 60)}:${String(beat.duration % 60).padStart(2, "0")}`
        : "—",
    })),
    status: pack.status === "published" ? "published" : "draft",
    updatedAtLabel: `Updated ${new Date(pack.updatedAt).toLocaleDateString()}`,
  };

  return <BeatPackEditorForm mode="edit" initialPack={initialPack} />;
}

