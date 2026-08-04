"use client";

import Link from "next/link";
import { CirclePause, CirclePlay } from "lucide-react";
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
  tracks,
  producerName,
  coverUrl,
}: PackTrackListProps) {
  const { playBeat, currentBeat, isPlaying } = useAudioActions();
  const { progress, currentTime } = useAudioProgress();

  const handlePreviewToggle = (track: BeatPackTrack) => {
    if (!track.previewUrl) {
      toast.info("Preview is not available for this track.");
      return;
    }
    playBeat({
      id: track.id,
      title: track.title,
      producerName,
      coverUrl,
      previewUrl: track.previewUrl,
    });
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
            className="rounded-lg border border-border/50 bg-background/50 p-2 sm:p-3"
          >
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium group-hover/track:text-primary transition-colors">
                    {index + 1}. {track.title}
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
            {currentBeat?.id === track.id && (
              <div className="mt-1.5 flex items-center gap-2">
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
