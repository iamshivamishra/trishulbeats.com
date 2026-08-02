import type { Metadata } from "next";
import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { likeRepository } from "@/lib/repositories/like.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AudioPlayer from "@/components/AudioPlayer";
import LicenseSelector from "@/components/LicenseSelector";
import DownloadPanel from "@/components/DownloadPanel";
import BeatCard from "@/components/BeatCard";
import { storageService } from "@/lib/services/storage.service";
import BeatHeroCard from "./BeatHeroCard";
import BeatProducerCard from "./BeatProducerCard";

export const revalidate = 60;

const getCachedBeat = cache(async (id: string) => {
  return beatRepository.findById(id);
});

interface BeatPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: BeatPageProps): Promise<Metadata> {
  const { id } = await params;
  const beat = await getCachedBeat(id);
  if (!beat || !beat.isPublished || beat.status !== "published") {
    return { title: "Beat Not Found" };
  }

  const producer = await userRepository.findById(beat.producerId.toString());
  const producerName = producer?.displayName || producer?.name || "Unknown";

  const description =
    beat.description ||
    `${beat.genre} beat at ${beat.bpm || "—"} BPM by ${producerName}. Preview and license on Trishul Beats.`;

  return {
    title: `${beat.title} by ${producerName}`,
    description,
    openGraph: {
      title: `${beat.title} — Trishul Beats`,
      description: `${beat.genre} beat at ${beat.bpm || "—"} BPM. License now.`,
      images: beat.coverUrl ? [beat.coverUrl] : ["/og-default.png"],
      type: "music.song",
      url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/beats/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `${beat.title} by ${producerName}`,
      description,
      images: beat.coverUrl ? [beat.coverUrl] : ["/og-default.png"],
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/beats/${id}`,
    },
  };
}

export default async function BeatPage({ params }: BeatPageProps) {
  const { id } = await params;
  const session = await auth();
  const beat = await getCachedBeat(id);
  if (!beat) notFound();
  const isOwner = session?.user?.id === beat.producerId.toString();
  const canViewUnpublished = isOwner || session?.user?.role === "admin";
  if ((!beat.isPublished || beat.status !== "published") && !canViewUnpublished) {
    notFound();
  }

  const [licenses, producer, relatedBeats] = await Promise.all([
    licenseRepository.findByBeatId(id),
    userRepository.findById(beat.producerId.toString()),
    beatRepository.findRelated(id, beat.genre, beat.producerId.toString(), 6),
  ]);

  const hasPurchased = session?.user
    ? await purchaseRepository.hasPurchased(session.user.id, id)
    : false;
  const isPackOnly = beat.saleMode === "pack_only";
  const canLike = session?.user?.role === "buyer" && beat.isPublished && beat.status === "published";
  const initialLiked =
    session?.user && canLike ? await likeRepository.isLiked(session.user.id, id) : false;

  const relatedWithPrices = await beatService.enrichWithPrices(relatedBeats);

  const cheapestLicense = licenses.reduce(
    (min, l) => (l.isActive && l.price < min ? l.price : min),
    Infinity
  );

  const previewAudioSrc = beat.storageKeys?.preview
    ? await storageService.getDownloadUrl(beat.storageKeys.preview, { expiresInSeconds: 3600 })
    : beat.audioTaggedUrl || beat.audioFullUrl;

  const fullAudioSrc = beat.storageKeys?.master
    ? await storageService.getDownloadUrl(beat.storageKeys.master, { expiresInSeconds: 3600 })
    : beat.audioFullUrl || beat.audioTaggedUrl;

  const audioSrc = hasPurchased ? fullAudioSrc : previewAudioSrc;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const producerName = producer?.displayName || producer?.name || "Unknown";

  const beatJsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name: beat.title,
    description: beat.description || `${beat.genre} beat at ${beat.bpm || "—"} BPM`,
    genre: beat.genre,
    url: `${appUrl}/beats/${id}`,
    image: beat.coverUrl || undefined,
    datePublished: beat.createdAt ? new Date(beat.createdAt).toISOString() : undefined,
    duration: beat.duration ? `PT${Math.floor(beat.duration / 60)}M${beat.duration % 60}S` : undefined,
    byArtist: {
      "@type": "Person",
      name: producerName,
      url: producer?.username ? `${appUrl}/producer/${producer.username}` : undefined,
    },
    offers: cheapestLicense < Infinity
      ? {
          "@type": "Offer",
          price: cheapestLicense,
          priceCurrency: "INR",
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: appUrl },
      { "@type": "ListItem", position: 2, name: "Browse Beats", item: `${appUrl}/beats` },
      { "@type": "ListItem", position: 3, name: beat.title, item: `${appUrl}/beats/${id}` },
    ],
  };

  return (
    <div className="page-shell px-4 sm:px-6 lg:px-8 pb-20 lg:pb-0">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(beatJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <Button asChild variant="ghost" size="sm" className="mb-3 sm:mb-8">
        <Link href="/beats">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Beats
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* Left Column */}
        <div className="space-y-3 sm:space-y-5 min-w-0">
          <BeatHeroCard
            beat={beat}
            beatId={id}
            hasPurchased={hasPurchased}
            canViewUnpublished={canViewUnpublished}
            canLike={canLike}
            initialLiked={initialLiked}
            isLoggedIn={!!session?.user}
            appUrl={appUrl}
          />

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-2 sm:p-4 md:p-5 overflow-x-hidden">
              <AudioPlayer
                src={audioSrc}
                title={beat.title}
                previewOnly={!hasPurchased}
                beatId={id}
                showWaveform
              />
            </CardContent>
          </Card>

          {beat.tags.length > 0 && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-3 sm:p-5">
                <h2 className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {beat.tags.map((tag) => (
                    <Link key={tag} href={`/beats?search=${encodeURIComponent(tag)}`}>
                      <Badge variant="secondary" className="text-xs transition-colors hover:bg-primary/20">
                        #{tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-3 sm:p-5">
              <h2 className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h2>
              <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">
                {beat.description || `"${beat.title}" is a ${beat.genre.toLowerCase()} beat${beat.bpm ? ` at ${beat.bpm} BPM` : ""}${beat.key ? ` in the key of ${beat.key}` : ""}${beat.mood ? ` with a ${beat.mood.toLowerCase()} mood` : ""}. Produced by ${producerName}${beat.tags.length > 0 ? `, featuring elements of ${beat.tags.slice(0, 3).join(", ")}` : ""}. Available for licensing on Trishul Beats with basic, premium, and unlimited license options.`}
              </p>
            </CardContent>
          </Card>

          {hasPurchased && <DownloadPanel beatId={id} />}

          <Separator />

          {producer && <BeatProducerCard producer={producer} />}
        </div>

        {/* Right Column */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          {isPackOnly && !hasPurchased ? (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="space-y-3 p-5">
                <Badge className="bg-amber-500 text-black">Pack Only</Badge>
                <h2 className="text-lg font-semibold">This beat is sold inside a Beat Pack</h2>
                <p className="text-sm text-muted-foreground">
                  Individual checkout is disabled for this track. Purchase the full pack to access all
                  included beats and downloads.
                </p>
                <Button asChild className="w-full">
                  <Link href={beat.packId ? `/beat-packs/${beat.packId}` : "/beat-packs"}>
                    View Beat Pack
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <LicenseSelector
              licenses={JSON.parse(JSON.stringify(licenses))}
              beatId={id}
              beatTitle={beat.title}
              isLoggedIn={!!session?.user}
              hasPurchased={hasPurchased}
            />
          )}
        </div>
      </div>

      {relatedWithPrices.length > 0 && (
        <div className="mt-12 sm:mt-16">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2 sm:mb-6">
            <h2 className="text-lg font-bold sm:text-xl">You Might Also Like</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/beats?genre=${encodeURIComponent(beat.genre)}`}>
                More {beat.genre}
                <ArrowLeft className="ml-1 h-4 w-4 rotate-180" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {relatedWithPrices.map(({ beat, startingPrice }) => (
              <BeatCard
                key={beat._id.toString()}
                beat={beat}
                startingPrice={startingPrice}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
