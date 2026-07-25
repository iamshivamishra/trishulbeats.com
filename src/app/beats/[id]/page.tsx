import type { Metadata } from "next";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Music, ArrowLeft, ExternalLink, BarChart3,
  ShoppingBag, Disc3, Calendar, Headphones,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { likeRepository } from "@/lib/repositories/like.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import AudioPlayer from "@/components/AudioPlayer";
import ShareDialog from "@/components/ShareDialog";
import LicenseSelector from "@/components/LicenseSelector";
import DownloadPanel from "@/components/DownloadPanel";
import BeatCard from "@/components/BeatCard";
import LikeButton from "@/components/LikeButton";
import { toPublicBeatForUi } from "@/lib/serializers/beat";
import { storageService } from "@/lib/services/storage.service";

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

  const relatedBeatIds = relatedBeats.map((b) => b._id.toString());
  const relatedProducerIds = [...new Set(relatedBeats.map((b) => b.producerId.toString()))];
  const [relatedCheapestMap, relatedProducers] = await Promise.all([
    licenseRepository.findCheapestForBeats(relatedBeatIds),
    userRepository.findByIds(relatedProducerIds),
  ]);
  const relatedProducerMap = new Map(relatedProducers.map((p) => [p._id.toString(), p]));

  const relatedWithPrices = relatedBeats.map((b) => {
    const relatedProducer = relatedProducerMap.get(b.producerId.toString()) ?? null;
    const cheapest = relatedCheapestMap[b._id.toString()];
    return {
      beat: toPublicBeatForUi(b, relatedProducer),
      startingPrice: cheapest?.price,
    };
  });

  const producerInitials = (producer?.displayName || producer?.name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const cheapestLicense = licenses.reduce(
    (min, l) => (l.isActive && l.price < min ? l.price : min),
    Infinity
  );

  const previewAudioSrc = beat.storageKeys?.preview
    ? await storageService.getDownloadUrl(beat.storageKeys.preview, {
        expiresInSeconds: 3600,
      })
    : beat.audioTaggedUrl || beat.audioFullUrl;

  const fullAudioSrc = beat.storageKeys?.master
    ? await storageService.getDownloadUrl(beat.storageKeys.master, {
        expiresInSeconds: 3600,
      })
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
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="mb-3 sm:mb-8">
        <Link href="/beats">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Beats
        </Link>
      </Button>

      {/* Hero: Artwork + Info + Player */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        {/* ====================== LEFT COLUMN ====================== */}
        <div className="space-y-3 sm:space-y-5 min-w-0">
          {/* Top section: artwork + title/meta side by side on larger screens */}
          <Card className="border-border/50 bg-card/60">
            <CardContent className="p-3 sm:p-5 md:p-6">
              <div className="flex flex-row items-start gap-3 sm:gap-6">
                {/* Artwork — compact on mobile */}
                <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-lg sm:w-48 sm:rounded-xl md:w-56 lg:w-64">
                  {beat.coverUrl ? (
                    <Image
                      src={beat.coverUrl}
                      alt={beat.title}
                      fill
                      className="object-cover"
                      priority
                      sizes="(max-width: 640px) 160px, (max-width: 768px) 192px, 256px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10">
                      <Music className="h-16 w-16 text-primary/30 sm:h-20 sm:w-20" />
                    </div>
                  )}
                  {hasPurchased && (
                    <Badge className="absolute right-1.5 top-1.5 bg-green-600 text-[10px] sm:right-3 sm:top-3 sm:text-sm">
                      Purchased
                    </Badge>
                  )}
                </div>

                {/* Title + Meta */}
                <div className="flex w-full min-w-0 flex-1 flex-col justify-between space-y-2 sm:space-y-4 text-left">
                  <div>
                    <h1 className="break-words text-base font-bold tracking-tight sm:text-2xl md:text-3xl">
                      {beat.title}
                    </h1>
                    {producer && (
                      <p className="mt-1 text-sm text-muted-foreground sm:text-base">
                        by{" "}
                        <Link
                          href={
                            producer.username
                              ? `/producer/${producer.username}`
                              : "#"
                          }
                          className="font-medium text-primary hover:underline"
                        >
                          {producer.displayName || producer.name}
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Stats row */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground sm:gap-x-4 sm:gap-y-2 sm:text-sm">
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-3.5 w-3.5 shrink-0" />
                      {beat.plays.toLocaleString()} plays
                    </span>
                    {canViewUnpublished && (
                      <span className="flex items-center gap-1">
                        <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                        {beat.salesCount} sold
                      </span>
                    )}
                    <LikeButton
                      beatId={id}
                      initialLiked={initialLiked}
                      initialLikesCount={beat.likesCount ?? 0}
                      isLoggedIn={!!session?.user}
                      canLike={canLike}
                    />
                    <ShareDialog
                      title={beat.title}
                      url={`${appUrl}/beats/${id}`}
                    />
                  </div>

                  {/* Compact mobile-only stats */}
                  <div className="flex flex-wrap gap-1.5 sm:hidden">
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.genre}</Badge>
                    {beat.bpm && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.bpm} BPM</Badge>}
                    {beat.key && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.key}</Badge>}
                    {beat.mood && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.mood}</Badge>}
                  </div>

                  {/* Meta stats grid — hidden on small mobile to save space */}
                  <div className="mt-2 hidden sm:block">
                    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Stats
                    </h2>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Published</p>
                        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                          <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {new Date(beat.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Genre</p>
                        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                          <Headphones className="h-4 w-4 shrink-0 text-muted-foreground" />
                          {beat.genre}
                        </p>
                      </div>
                      {beat.bpm && (
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">BPM</p>
                          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                            <Disc3 className="h-4 w-4 shrink-0 text-muted-foreground" />
                            {beat.bpm}
                          </p>
                        </div>
                      )}
                      {beat.key && (
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Key</p>
                          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                            {beat.key}
                          </p>
                        </div>
                      )}
                      {beat.mood && (
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Mood</p>
                          <p className="flex items-center justify-center gap-1.5 text-sm font-semibold sm:justify-start">
                            {beat.mood}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audio Player with Waveform */}
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

          {/* Tags */}
          {beat.tags.length > 0 && (
            <Card className="border-border/50 bg-card/60">
              <CardContent className="p-3 sm:p-5">
                <h2 className="mb-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {beat.tags.map((tag) => (
                    <Link key={tag} href={`/beats?search=${encodeURIComponent(tag)}`}>
                      <Badge
                        variant="secondary"
                        className="text-xs transition-colors hover:bg-primary/20"
                      >
                        #{tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Description */}
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

          {/* Download section (purchased users) */}
          {hasPurchased && <DownloadPanel beatId={id} />}

          <Separator />

          {/* Producer Info Card */}
          {producer && (
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                About the Producer
              </h2>
              <Card className="border-border/50 bg-card/80">
                <CardContent className="p-4">
                  <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
                    <Link
                      href={
                        producer.username
                          ? `/producer/${producer.username}`
                          : "#"
                      }
                      className="shrink-0"
                    >
                      <Avatar className="h-14 w-14">
                        {(producer.avatarUrl || producer.image) && (
                          <AvatarImage
                            src={producer.avatarUrl || producer.image}
                            alt={producer.displayName || producer.name}
                          />
                        )}
                        <AvatarFallback className="bg-primary/20 text-primary text-lg">
                          {producerInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0 w-full flex-1">
                      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                        <Link
                          href={
                            producer.username
                              ? `/producer/${producer.username}`
                              : "#"
                          }
                          className="font-semibold hover:text-primary"
                        >
                          {producer.displayName || producer.name}
                        </Link>
                        {producer.verified && (
                          <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                            Verified
                          </Badge>
                        )}
                      </div>
                      {producer.username && (
                        <p className="text-sm text-muted-foreground">
                          @{producer.username}
                        </p>
                      )}
                      {producer.bio && (
                        <p className="mt-2 text-sm text-foreground/70 line-clamp-2 break-words">
                          {producer.bio}
                        </p>
                      )}
                      {producer.genres && producer.genres.length > 0 && (
                        <div className="mt-2 flex flex-wrap justify-center gap-1 sm:justify-start">
                          {producer.genres.slice(0, 4).map((g) => (
                            <Badge
                              key={g}
                              variant="secondary"
                              className="text-xs"
                            >
                              {g}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-muted-foreground sm:justify-start">
                        <span>{producer.salesCount ?? 0} sales</span>
                        <span>{producer.followersCount ?? 0} followers</span>
                      </div>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full shrink-0 sm:w-auto">
                      <Link
                        href={
                          producer.username
                            ? `/producer/${producer.username}`
                            : "#"
                        }
                      >
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        Profile
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* ====================== RIGHT COLUMN (hidden on mobile, sticky sidebar on desktop) ====================== */}
        <div className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
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

      {/* Related Beats */}
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