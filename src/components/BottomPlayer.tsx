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
    playlist,
    togglePlay,
    seek,
    setVolume,
    closePlayer,
    playNext,
    playPrevious,
  } = useAudioPlayer();

  const pathname = usePathname();
  const [isMuted, setIsMuted] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);

  const isOnPackPage = currentBeat?.packId && pathname === `/beat-packs/${currentBeat.packId}`;

  if (!currentBeat) return null;

  // Playlist me kam se kam 2 tracks ho tabhi Next/Previous ka koi matlab hai.
  // Agar playlist khali hai ya sirf 1 track hai, to button disabled rehna
  // chahiye — warna user click karta hai aur kuch hota nahi (misleading UX).
  const currentIndex = playlist.findIndex((b) => b.id === currentBeat.id);
  const hasPlaylist = playlist.length > 1 && currentIndex !== -1;
  const hasPrevious = hasPlaylist && (currentIndex > 0 || currentTime > 3);
  const hasNext = hasPlaylist && currentIndex < playlist.length - 1;

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
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background dark:bg-[#0d0d0d]">
      {/* Seek bar */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Seek position"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        className="-mb-px cursor-pointer py-1.5 sm:py-0"
        onClick={handleSeekClick}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") seek(Math.min(progress + 5, 100));
          if (e.key === "ArrowLeft") seek(Math.max(progress - 5, 0));
        }}
      >
        <div className="h-1 w-full bg-muted sm:h-1">
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50">
            <Music className="h-4 w-4 text-muted-foreground/30" />
          </div>
        )}

        {/* Title + producer + time */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">{currentBeat.title}</p>
          <p className="truncate text-[10px] text-muted-foreground">
            {currentBeat.producerName}
            <span className="mx-1 text-muted-foreground/50">·</span>
            <span className="tabular-nums">{formatDuration(currentTime)}</span>
            <span className="text-muted-foreground/50"> / </span>
            <span className="tabular-nums">{formatDuration(duration)}</span>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={playPrevious}
            disabled={!hasPrevious}
            aria-label="Previous"
            className={`p-1 text-muted-foreground transition-colors ${
              hasPrevious ? "hover:text-foreground cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground text-background active:scale-95"
          >
            {isPlaying ? (
              <Pause className="h-3.5 w-3.5 fill-current" />
            ) : (
              <Play className="ml-0.5 h-3.5 w-3.5 fill-current" />
            )}
          </button>

          <button
            onClick={playNext}
            disabled={!hasNext}
            aria-label="Next"
            className={`p-1 text-muted-foreground transition-colors ${
              hasNext ? "hover:text-foreground cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
          >
            <SkipForward className="h-3.5 w-3.5" />
          </button>

          {showBuy && (
            <Link
              href={buyHref}
              aria-label={buyLabel}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground active:scale-95"
            >
              <BuyIcon className="h-3.5 w-3.5" />
            </Link>
          )}

          <button
            onClick={closePlayer}
            aria-label="Close player"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:scale-95 active:text-foreground"
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
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-muted/50">
              <Music className="h-5 w-5 text-muted-foreground/30" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{currentBeat.title}</p>
            <p className="truncate text-xs text-muted-foreground">{currentBeat.producerName}</p>
          </div>
        </div>

        {/* Share */}
        <div className="hidden shrink-0 items-center gap-3 text-muted-foreground md:flex">
          <ShareDialog title={currentBeat.title} url={beatUrl}>
            <button aria-label="Share" className="text-muted-foreground hover:text-foreground">
              <Share2 className="h-4 w-4" />
            </button>
          </ShareDialog>
        </div>

        {/* Center controls */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div className="flex items-center gap-4">
            <button
              onClick={playPrevious}
              disabled={!hasPrevious}
              aria-label="Previous"
              className={`text-muted-foreground transition-colors ${
                hasPrevious ? "hover:text-foreground cursor-pointer" : "opacity-40 cursor-not-allowed"
              }`}
            >
              <SkipBack className="h-4 w-4" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-95"
            >
              {isPlaying ? (
                <Pause className="h-4 w-4 fill-current" />
              ) : (
                <Play className="ml-0.5 h-4 w-4 fill-current" />
              )}
            </button>

            <button
              onClick={playNext}
              disabled={!hasNext}
              aria-label="Next"
              className={`text-muted-foreground transition-colors ${
                hasNext ? "hover:text-foreground cursor-pointer" : "opacity-40 cursor-not-allowed"
              }`}
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
            className={isRepeat ? "text-primary" : "text-muted-foreground hover:text-foreground"}
          >
            <Repeat className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setVolume(isMuted ? 1 : 0);
              setIsMuted(!isMuted);
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-muted-foreground hover:text-foreground"
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
            aria-label="Volume"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              setIsMuted(v === 0);
            }}
            className="w-24 accent-primary"
          />
        </div>

        {/* Close */}
        <button
          onClick={closePlayer}
          aria-label="Close player"
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}