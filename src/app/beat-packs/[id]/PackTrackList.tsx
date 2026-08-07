"use client";

import { useRef, useState } from "react";
import { GripVertical, CirclePause, CirclePlay } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useAudioActions,
  useAudioProgress,
} from "@/components/AudioPlayerContext";
import type { BeatPackTrack } from "@/features/beats/beat-pack-ui";
import { toast } from "sonner";

interface PackTrackListProps {
  tracks: BeatPackTrack[];
  producerName: string;
  coverUrl: string;
}

function formatElapsed(seconds: number) {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function PackTrackList({
  tracks: initialTracks,
  producerName,
  coverUrl,
}: PackTrackListProps) {
  const { playBeat, currentBeat, isPlaying } = useAudioActions();
  const { progress, currentTime } = useAudioProgress();

  const [tracks, setTracks] = useState<BeatPackTrack[]>(initialTracks);
  const dragIndex = useRef<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const handlePreviewToggle = (track: BeatPackTrack) => {
    if (!track.previewUrl) {
      toast.info("Preview is not available for this track.");
      return;
    }

    const playablePlaylist = tracks
      .filter((t) => !!t.previewUrl)
      .map((t) => ({
        id: t.id,
        title: t.title,
        producerName,
        coverUrl,
        previewUrl: t.previewUrl!,
      }));

    playBeat(
      {
        id: track.id,
        title: track.title,
        producerName,
        coverUrl,
        previewUrl: track.previewUrl,
      },
      playablePlaylist
    );
  };

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    setTracks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDragStart = (index: number) => (e: React.DragEvent) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
    // Firefox needs data set to enable drag
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (overIndex !== index) setOverIndex(index);
  };

  const handleDrop = (index: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex.current === null) return;
    reorder(dragIndex.current, index);
    dragIndex.current = null;
    setOverIndex(null);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setOverIndex(null);
  };

  return (
    <Card className="rounded-xl sm:rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader className="px-3 py-2.5 sm:px-6 sm:py-4">
        <CardTitle className="text-sm sm:text-lg">
          Tracks in This Pack
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 sm:space-y-2 px-3 pb-3 sm:px-6 sm:pb-6">
        {tracks.map((track, index) => (
          <div
            key={track.id}
            draggable
            onDragStart={handleDragStart(index)}
            onDragOver={handleDragOver(index)}
            onDrop={handleDrop(index)}
            onDragEnd={handleDragEnd}
            className={`rounded-lg border bg-background/50 p-2 sm:p-3 transition-colors ${
              overIndex === index
                ? "border-primary bg-primary/5"
                : "border-border/50"
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className="cursor-grab select-none text-muted-foreground/50 active:cursor-grabbing"
                aria-label="Drag to reorder"
              >
                <GripVertical className="h-4 w-4" />
              </span>

              <div className="flex min-w-0 flex-1 items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover/track:text-primary transition-colors">
                    {track.title}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {track.genre}
                    {track.bpm ? ` • ${track.bpm} BPM` : ""} •{" "}
                    {track.durationLabel}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={
                    currentBeat?.id === track.id && isPlaying
                      ? "Pause preview"
                      : "Play preview"
                  }
                  onClick={() => handlePreviewToggle(track)}
                >
                  {currentBeat?.id === track.id && isPlaying ? (
                    <CirclePause className="h-4 w-4" />
                  ) : (
                    <CirclePlay className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {currentBeat?.id === track.id && (
              <div className="mt-1.5 flex items-center gap-2 pl-6">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {formatElapsed(currentTime)}
                </span>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}