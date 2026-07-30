// components/BottomPlayer.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Share2,
  Download,
  Heart,
  Repeat,
  Volume2,
  VolumeX,
  ShoppingCart,
  Package,
  Music,
} from "lucide-react";
import { useAudioPlayer } from "@/components/AudioPlayerContext";
import ShareDialog from "@/components/ShareDialog";
import { formatDuration } from "@/lib/format";

export default function BottomPlayer() {
  const {
    currentBeat,
    isPlaying,
    currentTime,
    duration,
    progress,
    volume,
    togglePlay,
    seek,
    setVolume,
  } = useAudioPlayer();

  const pathname = usePathname();
  const [isMuted, setIsMuted] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const isOnPackPage = currentBeat?.packId && pathname === `/beat-packs/${currentBeat.packId}`;

  if (!currentBeat) return null;

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    seek(percent);
  };

  const beatUrl = typeof window !== "undefined" ? `${window.location.origin}/beats/${currentBeat.id}` : "";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0d0d0d]">
      {/* Seek bar */}
      <div className="h-1 w-full cursor-pointer bg-white/10" onClick={handleSeekClick}>
        <div
          className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-2 px-2 py-2 sm:gap-4 sm:px-4 sm:py-3">
        {/* Cover + Info */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:w-56 sm:flex-none sm:gap-3">
          {currentBeat.coverUrl ? (
            <Image
              src={currentBeat.coverUrl}
              alt={currentBeat.title}
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 rounded-md object-cover sm:h-12 sm:w-12"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/5 sm:h-12 sm:w-12">
              <Music className="h-4 w-4 text-white/30 sm:h-5 sm:w-5" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-white sm:text-sm">
              {currentBeat.title}
            </p>
            <p className="truncate text-[11px] text-zinc-400 sm:text-xs">
              {currentBeat.producerName}
            </p>
          </div>
        </div>

        {/* Share / Download / Like - tablet+ only */}
        <div className="hidden shrink-0 items-center gap-3 text-zinc-400 md:flex">
          <ShareDialog
            title={currentBeat.title}
            url={beatUrl}
          >
            <button aria-label="Share" className="hover:text-white text-zinc-400">
              <Share2 className="h-4 w-4" />
            </button>
          </ShareDialog>
          <Link href={`/beats/${currentBeat.id}`} aria-label="Download" className="hover:text-white">
            <Download className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setIsLiked(!isLiked)}
            aria-label={isLiked ? "Unlike" : "Like"}
            className={isLiked ? "text-primary" : "hover:text-white"}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Center controls - flex-1 taaki yeh beech ki jagah le aur play truly centered rahe */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              aria-label="Previous"
              className="hidden text-zinc-500 cursor-not-allowed sm:block"
              disabled
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95 sm:h-10 sm:w-10"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>
            <button
              aria-label="Next"
              className="hidden text-zinc-500 cursor-not-allowed sm:block"
              disabled
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <div className="hidden items-center gap-2 text-xs text-zinc-400 sm:flex">
            <span className="w-10 text-right">{formatDuration(currentTime)}</span>
            <span>/</span>
            <span className="w-10">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Repeat / Volume - desktop only */}
        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <button
            onClick={() => setIsRepeat(!isRepeat)}
            aria-label="Repeat"
            className={isRepeat ? "text-primary" : "text-zinc-400 hover:text-white"}
          >
            <Repeat className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setVolume(isMuted ? 1 : 0);
              setIsMuted(!isMuted);
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-zinc-400 hover:text-white"
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              setIsMuted(v === 0);
            }}
            className="w-24 accent-primary"
          />
        </div>

        {/* Buy button — hidden when already on the target page */}
        {!isOnPackPage && (
          currentBeat.packId ? (
            <Link
              href={`/beat-packs/${currentBeat.packId}`}
              aria-label="Buy Pack"
              className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 sm:px-4"
            >
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">Buy Pack</span>
            </Link>
          ) : (
            <Link
              href={`/beats/${currentBeat.id}`}
              aria-label="Buy"
              className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110 sm:px-4"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Buy</span>
            </Link>
          )
        )}
      </div>
    </div>
  );
}