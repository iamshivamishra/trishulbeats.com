"use client";

import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileArchive,
  FileAudio,
  GripVertical,
  Image as ImageIcon,
  Loader2,
  Music,
  Pause,
  Pencil,
  Play,
  Trash2,
  X,
} from "lucide-react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type BeatSlot, getFileStatus } from "./pack-beat-uploader-types";

interface PackTrackCardProps {
  slot: BeatSlot;
  index: number;
  isExpanded: boolean;
  isCurrentlyPlaying: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onRemove: () => void;
  onPlay: () => void;
  disabled?: boolean;
}

export function PackTrackCard({
  slot,
  index,
  isExpanded,
  isCurrentlyPlaying,
  onToggleExpand,
  onEdit,
  onRemove,
  onPlay,
  disabled,
}: PackTrackCardProps) {
  const isUploading = slot.status === "uploading";
  const isUploaded = slot.status === "uploaded";
  const hasError = slot.status === "error";
  const displayTitle = slot.title || `Beat #${index + 1}`;
  const files = getFileStatus(slot);

  return (
    <div
      className={`group rounded-xl border transition-all ${
        hasError ? "border-destructive/40 bg-destructive/5"
          : isUploaded ? "border-border/60 bg-background"
          : isUploading ? "border-primary/30 bg-primary/5"
          : "border-border/40 bg-background/80"
      } ${isExpanded ? "ring-1 ring-primary/20" : ""}`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />

        {slot.coverUrl ? (
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
            <NextImage src={slot.coverUrl} alt="" fill className="object-cover" sizes="40px" />
          </div>
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted/60">
            <Music className="h-4 w-4 text-muted-foreground" />
          </div>
        )}

        {isUploaded && slot.previewUrl && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition hover:bg-primary hover:text-primary-foreground"
          >
            {isCurrentlyPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
          </button>
        )}

        <button
          type="button"
          onClick={() => !isUploading && onToggleExpand()}
          disabled={isUploading}
          className="min-w-0 flex-1 text-left"
        >
          <p className="truncate text-sm font-medium leading-tight">{displayTitle}</p>
          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
            {slot.genre && <span>{slot.genre}</span>}
            {slot.bpm && <><span className="opacity-40">·</span><span>{slot.bpm} BPM</span></>}
            {slot.key && <><span className="opacity-40">·</span><span>{slot.key}</span></>}
            {slot.durationLabel && <><span className="opacity-40">·</span><Clock className="inline h-3 w-3" /><span>{slot.durationLabel}</span></>}
            {!slot.genre && !slot.bpm && !slot.title && <span className="italic">Not configured</span>}
          </div>
        </button>

        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <span className={`flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[9px] font-medium ${files.mp3 ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
            <FileAudio className="h-2.5 w-2.5" />MP3
          </span>
          <span className={`flex h-5 items-center gap-0.5 rounded-full px-1.5 text-[9px] font-medium ${files.wav ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"}`}>
            <FileAudio className="h-2.5 w-2.5" />WAV
          </span>
          {files.stems && (
            <span className="flex h-5 items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 text-[9px] font-medium text-amber-600">
              <FileArchive className="h-2.5 w-2.5" />ZIP
            </span>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {isUploaded && !slot.dirty && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {isUploaded && slot.dirty && <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600">Modified</Badge>}
          {(slot.saving || isUploading) && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          {hasError && <Badge variant="destructive" className="text-[10px]">Error</Badge>}
          {!isUploading && !isUploaded && slot.previewFile && slot.masterFile && slot.title && (
            <Badge className="bg-green-600/90 text-[10px] text-white">Ready</Badge>
          )}
          <button
            type="button"
            onClick={() => !isUploading && onToggleExpand()}
            disabled={isUploading}
            className="rounded p-0.5 text-muted-foreground transition hover:bg-muted"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {hasError && slot.errorMessage && (
        <div className="border-t border-destructive/20 px-4 py-2">
          <p className="text-xs text-destructive">{slot.errorMessage}</p>
        </div>
      )}

      {isExpanded && !isUploading && (
        <div className="border-t border-border/30 px-4 pb-3 pt-3">
          {!slot.existing && !slot.title ? (
            <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted/60">
                <Music className="h-5 w-5" />
              </div>
              <p className="text-xs">This beat needs details.</p>
              <Button type="button" size="sm" className="mt-1 h-8 gap-1.5 text-xs" onClick={onEdit} disabled={disabled}>
                <Pencil className="h-3 w-3" /> Fill Details
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {slot.description && <p className="text-xs leading-relaxed text-muted-foreground">{slot.description}</p>}

              <div className="flex flex-wrap gap-1.5">
                {slot.genre && <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">{slot.genre}</span>}
                {slot.bpm && <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{slot.bpm} BPM</span>}
                {slot.key && <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">Key: {slot.key}</span>}
                {slot.mood && <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">{slot.mood}</span>}
                {slot.durationLabel && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">
                    <Clock className="h-3 w-3" />{slot.durationLabel}
                  </span>
                )}
                {slot.tags && slot.tags.split(",").filter(Boolean).map((t) => (
                  <span key={t.trim()} className="inline-flex items-center rounded-md bg-muted/60 px-2 py-0.5 text-[11px] text-muted-foreground">#{t.trim()}</span>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                {([
                  { label: "Preview MP3", present: files.mp3, icon: <FileAudio className="h-3.5 w-3.5" />, color: "text-green-600 bg-green-500/10" },
                  { label: "Master WAV", present: files.wav, icon: <FileAudio className="h-3.5 w-3.5" />, color: "text-blue-600 bg-blue-500/10" },
                  { label: "Stems ZIP", present: files.stems, icon: <FileArchive className="h-3.5 w-3.5" />, color: "text-amber-600 bg-amber-500/10" },
                  { label: "Artwork", present: files.art, icon: <ImageIcon className="h-3.5 w-3.5" />, color: "text-purple-600 bg-purple-500/10" },
                ] as const).map((f) => (
                  <div key={f.label} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${f.present ? f.color : "bg-muted/40 text-muted-foreground"}`}>
                    {f.icon}
                    <span className="truncate">{f.label}</span>
                    {f.present ? <CheckCircle2 className="ml-auto h-3 w-3 shrink-0" /> : <X className="ml-auto h-3 w-3 shrink-0 opacity-40" />}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={onEdit} disabled={disabled}>
                  <Pencil className="h-3 w-3" /> Edit Beat
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:text-destructive" onClick={onRemove} disabled={disabled}>
                  <Trash2 className="mr-1 h-3 w-3" /> Remove
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
