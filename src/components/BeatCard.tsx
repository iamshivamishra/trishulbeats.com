// components/BeatCard.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Play, Pause, AudioWaveform, ShoppingCart, Music, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAudioPlayer } from "@/components/AudioPlayerContext";
import type { IBeat } from "@/types";

interface BeatCardProps {
  beat: IBeat;
  startingPrice?: number;
  isPurchased?: boolean;
}

export default function BeatCard({
  beat,
  startingPrice,
  isPurchased,
}: BeatCardProps) {
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
    <div className="group w-full bg-transparent">
      {/* IMAGE - sirf yahi rounded/contained hai */}
      <div
        role="button"
        tabIndex={0}
        onClick={handlePlayClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") handlePlayClick(e as any);
        }}
        aria-label={isThisBeatPlaying ? `Pause ${beat.title}` : `Play ${beat.title}`}
        className={`relative block aspect-square w-full cursor-pointer overflow-hidden rounded-xl ${
          isThisBeatActive ? "ring-2 ring-primary" : ""
        }`}
      >
        {beat.coverUrl ? (
          <Image
            src={beat.coverUrl}
            alt={beat.title}
            fill
            sizes="(max-width:640px)50vw,(max-width:1024px)33vw,20vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800">
            <Music className="h-10 w-10 text-zinc-500" />
          </div>
        )}

        {/* Play Button */}
        <div className="absolute bottom-3 left-3 z-10">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full shadow-md transition-all duration-300 ${
              isThisBeatActive
                ? "bg-primary text-primary-foreground scale-100 opacity-100"
                : "bg-purple-600 text-white scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100"
            }`}
          >
            {isThisBeatPlaying ? (
              <Pause className="h-4 w-4 fill-current" />
            ) : (
              <Play className="ml-0.5 h-4 w-4 fill-current" />
            )}
          </div>
        </div>

        {isPurchased && (
          <Badge className="absolute right-2 top-2 z-20 rounded-full bg-green-500 px-2 py-0.5 text-[10px] text-white shadow">
            Purchased
          </Badge>
        )}
      </div>

      {/* CONTENT - transparent, seedha page bg pe */}
      <Link href={`/beats/${beatId}`} className="block bg-transparent">
        <div className="space-y-2 pt-3">
          {/* Row 1: BPM left, price (no border) right */}
          <div className="flex items-center justify-between">
            {beat.bpm ? (
              <span className="flex items-center gap-1.5 text-sm text-zinc-400">
                <AudioWaveform className="h-4 w-4" />
                {beat.bpm} BPM
              </span>
            ) : (
              <span />
            )}
            {startingPrice !== undefined && (
  <span className="flex items-center gap-1.5">
    <ShoppingCart className="h-4 w-4 text-red-500" />
    <span className="text-sm font-medium text-red-500">
      ₹{startingPrice.toLocaleString("en-IN")}
    </span>
  </span>
)}
          </div>

          {/* Title + producer badge row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="truncate text-lg font-semibold text-white transition-colors duration-300 group-hover:text-primary">
                {beat.title}
              </h3>
              {beat.genre && (
                <Badge
                  variant="secondary"
                  className="shrink-0 rounded-md border border-amber-500/50 bg-transparent p-1 text-amber-500"
                >
                  <AudioWaveform className="h-3 w-3" />
                </Badge>
              )}
            </div>
            <MoreVertical className="h-4 w-4 shrink-0 text-zinc-500" />
          </div>

          {/* Producer */}
          <p className="truncate text-base text-zinc-400">
            {beat.producerName || "Unknown Producer"}
          </p>
        </div>
      </Link>
    </div>
  );
}