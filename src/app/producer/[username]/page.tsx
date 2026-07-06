import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Music, Play, ShoppingBag, Users, CheckCircle2, ExternalLink, Globe,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { toPublicBeatForUi } from "@/lib/serializers/beat";
import { followRepository } from "@/lib/repositories/follow.repository"; // <-- create if it doesn't exist yet
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import BeatCard from "@/components/BeatCard";
import FollowButton from "@/components/FollowButton";

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const producer = await userRepository.findByUsername(username);
  if (!producer) return { title: "Producer Not Found" };

  const displayName = producer.displayName || producer.name;
  return {
    title: `${displayName} (@${producer.username})`,
    description:
      producer.bio || `Check out beats by ${displayName} on Trishul Beats.`,
    openGraph: {
      images: producer.avatarUrl ? [producer.avatarUrl] : [],
    },
  };
}

function SocialIcon({ platform }: { platform: string }) {
  if (platform === "website") return <Globe className="h-4 w-4" />;
  return <ExternalLink className="h-4 w-4" />;
}

function socialLabel(platform: string): string {
  const labels: Record<string, string> = {
    instagram: "Instagram",
    youtube: "YouTube",
    twitter: "Twitter / X",
    website: "Website",
    spotify: "Spotify",
    soundcloud: "SoundCloud",
  };
  return labels[platform] || platform;
}

export default async function ProducerProfilePage({ params }: Props) {
  const { username } = await params;
  const producer = await userRepository.findByUsername(username);
  if (!producer || producer.role !== "producer") notFound();

  const session = await auth();
  const isOwner = session?.user?.id === producer._id.toString();
  const isLoggedIn = !!session?.user;

  const isFollowing =
    session?.user && !isOwner
      ? await followRepository.isFollowing(session.user.id, producer._id.toString())
      : false;

  const beats = await beatRepository.findByProducerId(producer._id.toString());
  const totalPlays = beats.reduce((sum, b) => sum + b.plays, 0);

  const beatsWithPrices = await Promise.all(
    beats.map(async (beat) => {
      const cheapest = await licenseRepository.findCheapestForBeat(beat._id.toString());
      const isPurchased = session?.user
        ? await purchaseRepository.hasPurchased(session.user.id, beat._id.toString())
        : false;
      return { beat, startingPrice: cheapest?.price, isPurchased };
    })
  );

  const displayName = producer.displayName || producer.name;
  const initials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const socialEntries = Object.entries(producer.socialLinks || {}).filter(
    ([, url]) => url && url.length > 0
  );

  return (
    <div>
      {/* Cover image */}
      <div className="relative h-48 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background sm:h-64 lg:h-72">
        {producer.coverImageUrl && (
          <Image
            src={producer.coverImageUrl}
            alt={`${displayName} cover`}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      <div className="app-container max-w-5xl">
        {/* Profile header */}
        <div className="relative -mt-16 flex flex-col items-center gap-4 sm:-mt-20 sm:flex-row sm:items-end sm:gap-6">
          <Avatar className="h-28 w-28 border-4 border-background shadow-xl sm:h-36 sm:w-36">
            {producer.avatarUrl ? (
              <AvatarImage src={producer.avatarUrl} alt={displayName} />
            ) : producer.image ? (
              <AvatarImage src={producer.image} alt={displayName} />
            ) : null}
            <AvatarFallback className="bg-primary/20 text-primary text-4xl">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:pb-2 sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-semibold sm:text-3xl">{displayName}</h1>
              {producer.verified && (
                <CheckCircle2 className="h-5 w-5 fill-primary text-primary-foreground" />
              )}
            </div>
            <p className="text-muted-foreground">@{producer.username}</p>
          </div>

          {isOwner ? (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <Link href="/profile/edit">Edit Profile</Link>
            </Button>
          ) : (
            <FollowButton
              producerId={producer._id.toString()}
              initialIsFollowing={isFollowing}
              isLoggedIn={isLoggedIn}
            />
          )}
        </div>

        {/* Stats row */}
        <div className="mt-6 flex items-center justify-center gap-6 text-center sm:justify-start sm:gap-10">
          <div>
            <p className="text-xl font-bold">{beats.length}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Music className="h-3 w-3" /> Beats
            </p>
          </div>
          <div>
            <p className="text-xl font-bold">{totalPlays.toLocaleString()}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Play className="h-3 w-3" /> Plays
            </p>
          </div>
          {isOwner && (
            <div>
              <p className="text-xl font-bold">{producer.salesCount ?? 0}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShoppingBag className="h-3 w-3" /> Sales
              </p>
            </div>
          )}
          <div>
            <p className="text-xl font-bold">{producer.followersCount ?? 0}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" /> Followers
            </p>
          </div>
        </div>

        {/* Bio + Genres + Social */}
        <div className="mt-6 space-y-4">
          {producer.bio && (
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {producer.bio}
            </p>
          )}

          {producer.genres && producer.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {producer.genres.map((g) => (
                <Badge key={g} variant="secondary" className="text-xs">
                  {g}
                </Badge>
              ))}
            </div>
          )}

          {socialEntries.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {socialEntries.map(([platform, url]) => (
                <a
                  key={platform}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-border/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  <SocialIcon platform={platform} />
                  {socialLabel(platform)}
                </a>
              ))}
            </div>
          )}
        </div>

        <Separator className="my-8" />

        {/* Beats grid */}
        <div className="pb-16">
          <h2 className="mb-6 text-xl font-bold">
            Beats{" "}
            <span className="text-muted-foreground font-normal text-base">
              ({beats.length})
            </span>
          </h2>

          {beatsWithPrices.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {beatsWithPrices.map(({ beat, startingPrice, isPurchased }) => (
                <BeatCard
                  key={beat._id.toString()}
                  beat={toPublicBeatForUi(beat)}
                  startingPrice={startingPrice}
                  isPurchased={isPurchased}
                />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center text-muted-foreground">
              <Music className="mx-auto mb-2 h-12 w-12" />
              <p className="text-lg font-medium">No beats published yet</p>
              {isOwner && (
                <Button asChild className="mt-4">
                  <Link href="/upload">Upload your first beat</Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}