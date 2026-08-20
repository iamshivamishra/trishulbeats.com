import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BeatPackDetailClient from "@/app/beat-packs/[id]/BeatPackDetailClient";
import { auth } from "@/lib/auth";
import { beatPackService } from "@/lib/services/beat-pack.service";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { withPresignedPackImages } from "@/lib/serializers/presign";
import { storageService } from "@/lib/services/storage.service";
import type { BeatPackUi, PurchasedTierInfo } from "@/features/beats/beat-pack-ui";

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // IMPORTANT: pack.imageUrls / pack.coverUrl are raw storage keys, not
  // browsable URLs. They must be converted to a presigned/public URL before
  // being used as og:image, otherwise WhatsApp/Facebook crawlers can't fetch
  // the image and no preview shows up.
  const rawImage = pack.imageUrls?.[0] || pack.coverUrl;
  const ogImage = rawImage ? await storageService.presignUrl(rawImage) : undefined;

  const title = `${pack.title} — Beat Pack`;
  const description =
    pack.description || `Beat pack by ${pack.producerName || "a producer"} on Trishul Beats.`;

  return {
    title,
    description,
    alternates: { canonical: `/beat-packs/${id}` },
    openGraph: {
      title,
      description,
      url: `${appUrl}/beat-packs/${id}`,
      type: "website",
      images: ogImage
        ? [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: pack.title,
            },
          ]
        : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
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
  let purchasedTier: PurchasedTierInfo | null = null;

  if (session?.user) {
    const beatIdStrs = pack.beatIds.map((id) => id.toString());
    ownershipFlags = await Promise.all(
      beatIdStrs.map((beatId) => purchaseRepository.hasPurchased(session.user.id, beatId))
    );

    const ownedAny = ownershipFlags.some(Boolean);
    if (ownedAny) {
      const purchases = await purchaseRepository.findByBuyerAndBeatIds(
        session.user.id,
        beatIdStrs.filter((_, i) => ownershipFlags[i])
      );
      const firstPurchase = purchases[0];
      if (firstPurchase) {
        purchasedTier = {
          tier: firstPurchase.licenseType as "basic" | "premium" | "unlimited",
          includesWav: firstPurchase.includesWav ?? false,
          includesStems: firstPurchase.includesStems ?? false,
        };
      }
    }
  }

  const hasPurchasedAll = ownershipFlags.length > 0 && ownershipFlags.every(Boolean);
  const ownedBeatCount = ownershipFlags.filter(Boolean).length;

  const uiPack: BeatPackUi = await withPresignedPackImages({
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
    tracks: await Promise.all(
      pack.beats.map(async (beat) => ({
        id: beat._id.toString(),
        title: beat.title,
        genre: beat.genre,
        bpm: beat.bpm,
        durationLabel: beat.duration
          ? `${Math.floor(beat.duration / 60)}:${String(beat.duration % 60).padStart(2, "0")}`
          : "—",
        previewUrl: await storageService.presignUrl(beat.audioTaggedUrl),
      }))
    ),
    status: pack.status === "published" ? "published" : "draft",
    updatedAtLabel: `Updated ${new Date(pack.updatedAt).toLocaleDateString()}`,
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Same fix applied here for JSON-LD structured data's "image" field —
  // raw storage key must be presigned before use.
  const rawPackImage = pack.imageUrls?.[0] || pack.coverUrl;
  const packImage = rawPackImage ? await storageService.presignUrl(rawPackImage) : undefined;

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
        purchasedTier={purchasedTier}
      />
    </>
  );
}