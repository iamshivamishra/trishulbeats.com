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
  X,
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
    closePlayer,
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

  const buyHref = currentBeat.packId
    ? `/beat-packs/${currentBeat.packId}`
    : `/beats/${currentBeat.id}`;
  const buyLabel = currentBeat.packId ? "Buy Pack" : "Buy";
  const BuyIcon = currentBeat.packId ? Package : ShoppingCart;
  const showBuy = !isOnPackPage;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0d0d0d]">
      {/* Seek bar — larger touch target on mobile via padding */}
      <div className="-mb-px cursor-pointer py-1.5 sm:py-0" onClick={handleSeekClick}>
        <div className="h-1 w-full bg-white/10 sm:h-1">
          <div
            className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ========== MOBILE LAYOUT (below sm) ========== */}
      <div className="flex items-center gap-2 px-2 py-1.5 sm:hidden">
        {/* Cover art */}
        {currentBeat.coverUrl ? (
          <Image
            src={currentBeat.coverUrl}
            alt={currentBeat.title}
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white/5">
            <Music className="h-4 w-4 text-white/30" />
          </div>
        )}

        {/* Title + producer + time */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-white">{currentBeat.title}</p>
          <p className="truncate text-[10px] text-zinc-400">
            {currentBeat.producerName}
            <span className="mx-1 text-zinc-600">·</span>
            <span className="tabular-nums">{formatDuration(currentTime)}</span>
            <span className="text-zinc-600"> / </span>
            <span className="tabular-nums">{formatDuration(duration)}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
            )}
          </button>

          {/* Buy */}
          {showBuy && (
            <Link
              href={buyHref}
              aria-label={buyLabel}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
            >
              <BuyIcon className="h-3.5 w-3.5" />
            </Link>
          )}

          {/* Close */}
          <button
            onClick={closePlayer}
            aria-label="Close player"
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 active:scale-95 active:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ========== DESKTOP LAYOUT (sm+) ========== */}
      <div className="hidden items-center gap-4 px-4 py-3 sm:flex">
        {/* Cover + Info */}
        <div className="flex w-56 shrink-0 items-center gap-3">
          {currentBeat.coverUrl ? (
            <Image
              src={currentBeat.coverUrl}
              alt={currentBeat.title}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-white/5">
              <Music className="h-5 w-5 text-white/30" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-white">{currentBeat.title}</p>
            <p className="truncate text-xs text-zinc-400">{currentBeat.producerName}</p>
          </div>
        </div>

        {/* Share / Download / Like */}
        <div className="hidden shrink-0 items-center gap-3 text-zinc-400 md:flex">
          <ShareDialog title={currentBeat.title} url={beatUrl}>
            <button aria-label="Share" className="text-zinc-400 hover:text-white">
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

        {/* Center controls */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button aria-label="Previous" className="text-zinc-500 cursor-not-allowed" disabled>
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>
            <button aria-label="Next" className="text-zinc-500 cursor-not-allowed" disabled>
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-10 text-right">{formatDuration(currentTime)}</span>
            <span>/</span>
            <span className="w-10">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Repeat / Volume */}
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

        {/* Buy button */}
        {showBuy && (
          <Link
            href={buyHref}
            aria-label={buyLabel}
            className="flex shrink-0 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:brightness-110"
          >
            <BuyIcon className="h-4 w-4" />
            <span>{buyLabel}</span>
          </Link>
        )}

        {/* Close */}
        <button
          onClick={closePlayer}
          aria-label="Close player"
          className="shrink-0 text-zinc-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
