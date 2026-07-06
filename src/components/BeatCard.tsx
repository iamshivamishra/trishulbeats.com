// components/BeatCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, Clock, Music } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import { useAudioPlayer } from "@/components/AudioPlayerContext";
import type { IBeat } from "@/types";

interface BeatCardProps {
  beat: IBeat;
  startingPrice?: number;
  isPurchased?: boolean;
}

export default function BeatCard({ beat, startingPrice, isPurchased }: BeatCardProps) {
  const { playBeat, currentBeat, isPlaying } = useAudioPlayer();

  const beatId = beat._id.toString();
  const isThisBeatActive = currentBeat?.id === beatId;
  const isThisBeatPlaying = isThisBeatActive && isPlaying;

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    playBeat({
      id: beatId,
      title: beat.title,
      producerName: (beat as any).producerName ?? "",
      coverUrl: beat.coverUrl,
      previewUrl: beat.audioTaggedUrl,
    });
  };

  return (
    <Card className="group overflow-hidden border-border/60 bg-card/70 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:bg-card">
      {/* IMAGE - click yahan = sirf PLAY, navigate nahi */}
      <button
        type="button"
        onClick={handlePlayClick}
        aria-label={isThisBeatPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
        className="relative block aspect-square w-full overflow-hidden"
      >
        {beat.coverUrl ? (
          <Image
            src={beat.coverUrl}
            alt={beat.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/10">
            <Music className="h-12 w-12 text-primary/40" />
          </div>
        )}
        <div
          className={`absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100 ${
            isThisBeatActive ? "bg-black/40 opacity-100" : ""
          }`}
        >
          <span className="rounded-full bg-primary p-3 transition-transform hover:scale-110 active:scale-95">
            {isThisBeatPlaying ? (
              <Pause className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
            ) : (
              <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
            )}
          </span>
        </div>
        {isPurchased && (
          <Badge className="absolute right-2 top-2 bg-green-600">Purchased</Badge>
        )}
      </button>

      {/* INFO SECTION - click yahan = NAVIGATE to beat page */}
      <Link href={`/beats/${beatId}`} aria-label={`Open beat ${beat.title}`} className="block focus-ring">
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-semibold leading-5">{beat.title}</h3>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(beat.duration)}
            </span>
            {beat.bpm && <span>{beat.bpm} BPM</span>}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">{beat.genre}</Badge>
            {startingPrice !== undefined && (
              <span className="text-sm font-bold text-primary">
                ₹{startingPrice}
              </span>
            )}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}