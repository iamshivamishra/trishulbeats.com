import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BeatPackDetailClient from "@/app/beat-packs/[id]/BeatPackDetailClient";
import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

export const dynamic = "force-dynamic";

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
    alternates: { canonical: `/beat-packs/${id}` },
    openGraph: {
      title: `${pack.title} — Beat Pack`,
      description: pack.description || `Beat pack by ${pack.producerName || "a producer"} on Trishul Beats.`,
      images: pack.imageUrls?.[0] ? [pack.imageUrls[0]] : pack.coverUrl ? [pack.coverUrl] : [],
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/beat-packs/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${pack.title} — Beat Pack`,
      description: pack.description || `Beat pack on Trishul Beats.`,
      images: pack.imageUrls?.[0] ? [pack.imageUrls[0]] : pack.coverUrl ? [pack.coverUrl] : [],
    },
  };
}

export default async function BeatPackDetailPage({ params }: Props) {
  const { id } = await params;
  const pack = await beatPackService.getPackDetail(id).catch(() => null);
  if (!pack) {
    notFound();
  }
  const session = await auth();

  let ownershipFlags: boolean[] = [];

  if (session?.user) {
    ownershipFlags = await Promise.all(
      pack.beatIds.map((beatId) =>
        purchaseRepository.hasPurchased(session.user.id, beatId.toString())
      )
    );
  }

  const hasPurchasedAll = ownershipFlags.length > 0 && ownershipFlags.every(Boolean);
  const ownedBeatCount = ownershipFlags.filter(Boolean).length;

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const packImage = pack.imageUrls?.[0] || pack.coverUrl || undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: pack.title,
    description: pack.description || `Beat pack on Trishul Beats.`,
    image: packImage,
    url: `${appUrl}/beat-packs/${id}`,
    brand: { "@type": "Brand", name: pack.producerName || "Trishul Beats" },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: pack.prices.basic,
      highPrice: pack.prices.unlimited,
      offerCount: 3,
      availability: "https://schema.org/InStock",
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Beat Packs", item: `${appUrl}/beat-packs` },
      { "@type": "ListItem", position: 3, name: pack.title, item: `${appUrl}/beat-packs/${id}` },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <BeatPackDetailClient
        pack={uiPack}
        isLoggedIn={!!session?.user}
        hasPurchasedAll={hasPurchasedAll}
        ownedBeatCount={ownedBeatCount}
      />
    </>
  );
}

