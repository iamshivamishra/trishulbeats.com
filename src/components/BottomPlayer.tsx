// components/BottomPlayer.tsx
"use client";

import Image from "next/image";
import { Play, Pause, Volume2, VolumeX, X, Music } from "lucide-react";
import { useAudioPlayer } from "@/components/AudioPlayerContext";
import { formatDuration } from "@/lib/format";
import { useState } from "react";

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

  const [isMuted, setIsMuted] = useState(false);

  if (!currentBeat) return null; // koi beat select nahi -> player hide

  const handleSeekClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = ((e.clientX - rect.left) / rect.width) * 100;
    seek(percent);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur-md">
      {/* Seek bar - top edge */}
      <div
        className="h-1 w-full cursor-pointer bg-muted"
        onClick={handleSeekClick}
      >
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        {/* Cover + Info */}
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:flex-initial sm:w-64">
          {currentBeat.coverUrl ? (
            <Image
              src={currentBeat.coverUrl}
              alt={currentBeat.title}
              width={48}
              height={48}
              className="h-12 w-12 shrink-0 rounded-md object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/10">
              <Music className="h-5 w-5 text-primary/40" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{currentBeat.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {currentBeat.producerName}
            </p>
          </div>
        </div>

        {/* Play/Pause - center */}
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-primary hover:scale-105 active:scale-95 transition-transform"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4 fill-primary-foreground text-primary-foreground" />
            ) : (
              <Play className="h-4 w-4 fill-primary-foreground text-primary-foreground ml-0.5" />
            )}
          </button>
        </div>

        {/* Time - hidden on small screens */}
        <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <span className="w-10 text-right">{formatDuration(currentTime)}</span>
          <span>/</span>
          <span className="w-10">{formatDuration(duration)}</span>
        </div>

        {/* Volume - hidden on small screens */}
        <div className="hidden items-center gap-2 sm:flex">
          <button
            onClick={() => {
              setVolume(isMuted ? 1 : 0);
              setIsMuted(!isMuted);
            }}
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              setVolume(v);
              setIsMuted(v === 0);
            }}
            className="w-20 accent-primary"
          />
        </div>

        {/* Close */}
        <button
          onClick={closePlayer}
          aria-label="Close player"
          className="ml-1 shrink-0 rounded-full p-1.5 hover:bg-muted"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}