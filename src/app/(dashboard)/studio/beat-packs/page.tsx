import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import StudioBeatPacksClient from "@/features/studio/StudioBeatPacksClient";
import { beatPackService } from "@/lib/services/beat-pack.service";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

export const metadata: Metadata = {
  title: "Studio — Beat Packs",
};

export default async function StudioBeatPacksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const result = await beatPackService.listByProducer(session.user.id, {
    page: 1,
    limit: 50,
  });
  const packs: BeatPackUi[] = result.data.map((pack) => ({
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
    tracks: [],
    status: pack.status === "published" ? "published" : "draft",
    updatedAtLabel: `Updated ${new Date(pack.updatedAt).toLocaleDateString()}`,
  }));

  return <StudioBeatPacksClient packs={packs} />;
}

