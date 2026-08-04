import Image from "next/image";
import Link from "next/link";
import {
  Music, BarChart3, ShoppingBag, Disc3, Calendar, Headphones,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import LikeButton from "@/components/LikeButton";
import ShareDialog from "@/components/ShareDialog";

interface BeatHeroCardProps {
  beat: {
    title: string;
    coverUrl?: string;
    genre: string;
    bpm?: number;
    key?: string;
    mood?: string;
    plays: number;
    salesCount: number;
    likesCount?: number;
    createdAt: string | Date;
  };
  beatId: string;
  hasPurchased: boolean;
  canViewUnpublished: boolean;
  canLike: boolean;
  initialLiked: boolean;
  isLoggedIn: boolean;
  appUrl: string;
}

export default function BeatHeroCard({
  beat, beatId, hasPurchased, canViewUnpublished,
  canLike, initialLiked, isLoggedIn, appUrl,
}: BeatHeroCardProps) {
  return (
    <Card className="border-border/50 bg-card/60">
      <CardContent className="p-3 sm:p-5 md:p-6">
        <div className="flex flex-row items-start gap-3 sm:gap-6">
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

          <div className="flex w-full min-w-0 flex-1 flex-col justify-between space-y-2 sm:space-y-4 text-left">
            <div>
              <h1 className="break-words text-base font-bold tracking-tight sm:text-2xl md:text-3xl">
                {beat.title}
              </h1>
            </div>

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
                beatId={beatId}
                initialLiked={initialLiked}
                initialLikesCount={beat.likesCount ?? 0}
                isLoggedIn={isLoggedIn}
                canLike={canLike}
              />
              <ShareDialog title={beat.title} url={`${appUrl}/beats/${beatId}`} />
            </div>

            <div className="flex flex-wrap gap-1.5 sm:hidden">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.genre}</Badge>
              {beat.bpm && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.bpm} BPM</Badge>}
              {beat.key && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.key}</Badge>}
              {beat.mood && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{beat.mood}</Badge>}
            </div>

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
  );
}
