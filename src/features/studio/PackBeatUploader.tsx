"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileArchive,
  Image as ImageIcon,
  Loader2,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import { useAudioActions } from "@/components/AudioPlayerContext";

// ─── Types ────────────────────────────────────────────────────────

export interface BeatSlot {
  /** Client-side key for React rendering */
  clientId: string;
  /** Set after the beat is created on the server */
  beatId?: string;
  title: string;
  description: string;
  genre: string;
  bpm: string;
  key: string;
  mood: string;
  tags: string;
  priceBasic: string;
  pricePremium: string;
  priceUnlimited: string;
  durationLabel: string;
  previewUrl: string;
  previewFile: File | null;
  masterFile: File | null;
  stemsFile: File | null;
  artworkFile: File | null;
  previewProgress: number;
  masterProgress: number;
  stemsProgress: number;
  artworkProgress: number;
  status: "pending" | "uploading" | "uploaded" | "error";
  errorMessage?: string;
  /** True for beats that were already in the pack (edit mode) */
  existing?: boolean;
  /** True when an existing beat's metadata has been modified */
  dirty?: boolean;
  /** True while saving an existing beat update */
  saving?: boolean;
  /** True when the user has clicked edit on an existing beat */
  editing?: boolean;
}

interface Props {
  slots: BeatSlot[];
  onChange: (slots: BeatSlot[]) => void;
  disabled?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

const MAX_SIZES: Record<string, number> = {
  preview: 50 * 1024 * 1024,      // 50 MB
  master: 500 * 1024 * 1024,      // 500 MB
  stems: 5 * 1024 * 1024 * 1024,  // 5 GB
  artwork: 5 * 1024 * 1024,       // 5 MB
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function createEmptySlot(): BeatSlot {
  return {
    clientId: crypto.randomUUID(),
    title: "",
    description: "",
    genre: "",
    bpm: "",
    key: "",
    mood: "",
    tags: "",
    priceBasic: "",
    pricePremium: "",
    priceUnlimited: "",
    durationLabel: "",
    previewUrl: "",
    previewFile: null,
    masterFile: null,
    stemsFile: null,
    artworkFile: null,
    previewProgress: 0,
    masterProgress: 0,
    stemsProgress: 0,
    artworkProgress: 0,
    status: "pending",
  };
}

export function createExistingSlot(track: {
  id: string;
  title: string;
  description?: string;
  genre: string;
  bpm?: number;
  key?: string;
  mood?: string;
  tags?: string[];
  priceBasic?: number;
  pricePremium?: number;
  priceUnlimited?: number;
  durationLabel?: string;
  previewUrl?: string;
}): BeatSlot {
  return {
    clientId: crypto.randomUUID(),
    beatId: track.id,
    title: track.title,
    description: track.description ?? "",
    genre: track.genre,
    bpm: track.bpm?.toString() ?? "",
    key: track.key ?? "",
    mood: track.mood ?? "",
    tags: track.tags?.join(", ") ?? "",
    priceBasic: track.priceBasic?.toString() ?? "",
    pricePremium: track.pricePremium?.toString() ?? "",
    priceUnlimited: track.priceUnlimited?.toString() ?? "",
    durationLabel: track.durationLabel ?? "",
    previewUrl: track.previewUrl ?? "",
    previewFile: null,
    masterFile: null,
    stemsFile: null,
    artworkFile: null,
    previewProgress: 0,
    masterProgress: 0,
    stemsProgress: 0,
    artworkProgress: 0,
    status: "uploaded",
    existing: true,
  };
}

// ─── Upload logic (called from parent on submit) ─────────────────

interface PresignedPayload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  fields?: Record<string, string>;
}

async function uploadFileWithPresign(
  file: File,
  category: "preview" | "master" | "stems" | "artwork",
  beatId: string,
  onProgress: (pct: number) => void
): Promise<{ url: string; key: string }> {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      beatId,
      category,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!presignRes.ok) {
    const payload = await presignRes.json().catch(() => ({}));
    throw new Error(payload?.error || "Failed to create upload URL");
  }

  const target = (await presignRes.json()) as PresignedPayload;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      reject(new Error(`Upload failed (${xhr.status})`));
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    if (target.fields) {
      xhr.open("POST", target.uploadUrl);
      const fd = new FormData();
      fd.append("file", file);
      for (const [k, v] of Object.entries(target.fields)) fd.append(k, v);
      xhr.send(fd);
    } else {
      xhr.open("PUT", target.uploadUrl);
      xhr.setRequestHeader("Content-Type", file.type);
      xhr.send(file);
    }
  });

  return { url: target.publicUrl, key: target.key };
}

/**
 * Upload all pending beat slots, create beats on the server,
 * and return the full list of beat IDs (existing + newly created).
 */
export async function uploadPendingBeats(
  slots: BeatSlot[],
  onUpdate: (index: number, patch: Partial<BeatSlot>) => void
): Promise<string[]> {
  const beatIds: string[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];

    if (slot.status === "uploaded" && slot.beatId) {
      beatIds.push(slot.beatId);
      continue;
    }

    if (!slot.previewFile || !slot.masterFile) {
      throw new Error(`Beat "${slot.title || `#${i + 1}`}" is missing required audio files`);
    }
    if (!slot.title.trim()) {
      throw new Error(`Beat #${i + 1} is missing a title`);
    }
    if (!slot.genre) {
      throw new Error(`Beat "${slot.title}" is missing a genre`);
    }

    onUpdate(i, {
      status: "uploading",
      previewProgress: 0,
      masterProgress: 0,
      stemsProgress: 0,
      artworkProgress: 0,
    });

    try {
      const beatId = crypto.randomUUID();

      // Upload all files in parallel
      const [previewAsset, masterAsset, stemsAsset, artworkAsset] = await Promise.all([
        uploadFileWithPresign(slot.previewFile, "preview", beatId, (pct) =>
          onUpdate(i, { previewProgress: pct })
        ),
        uploadFileWithPresign(slot.masterFile, "master", beatId, (pct) =>
          onUpdate(i, { masterProgress: pct })
        ),
        slot.stemsFile
          ? uploadFileWithPresign(slot.stemsFile, "stems", beatId, (pct) =>
              onUpdate(i, { stemsProgress: pct })
            )
          : Promise.resolve(undefined),
        slot.artworkFile
          ? uploadFileWithPresign(slot.artworkFile, "artwork", beatId, (pct) =>
              onUpdate(i, { artworkProgress: pct })
            )
          : Promise.resolve(undefined),
      ]);

      const parsedTags = slot.tags
        ? slot.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      const licensesPayload =
        slot.priceBasic || slot.pricePremium || slot.priceUnlimited
          ? {
              basic: slot.priceBasic ? { price: Number(slot.priceBasic) } : undefined,
              premium: slot.pricePremium ? { price: Number(slot.pricePremium) } : undefined,
              unlimited: slot.priceUnlimited ? { price: Number(slot.priceUnlimited) } : undefined,
            }
          : undefined;

      const createRes = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: slot.title.trim(),
          description: slot.description.trim() || undefined,
          genre: slot.genre,
          bpm: slot.bpm ? Number(slot.bpm) : undefined,
          key: slot.key || undefined,
          mood: slot.mood || undefined,
          tags: parsedTags,
          status: "published",
          licenses: licensesPayload,
          uploadedAssets: {
            preview: previewAsset,
            master: masterAsset,
            stems: stemsAsset,
            artwork: artworkAsset,
          },
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create beat");
      }

      const { beat } = await createRes.json();
      const newBeatId = beat?._id || beat?.id || beatId;

      onUpdate(i, { status: "uploaded", beatId: newBeatId });
      beatIds.push(newBeatId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      onUpdate(i, { status: "error", errorMessage: message });
      throw error;
    }
  }

  return beatIds;
}

// ─── File picker sub-component ───────────────────────────────────

function FilePickerSlot({
  label,
  accept,
  file,
  required,
  hint,
  icon,
  maxSize,
  onSelect,
  onClear,
}: {
  label: string;
  accept: string;
  file: File | null;
  required?: boolean;
  hint?: string;
  icon: React.ReactNode;
  maxSize: number;
  onSelect: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > maxSize) {
            toast.error(`${label} must be under ${formatSize(maxSize)}`);
            return;
          }
          onSelect(f);
          if (ref.current) ref.current.value = "";
        }}
      />
      <div
        onClick={() => ref.current?.click()}
        className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border/70 bg-background/60 px-3 py-2.5 transition hover:border-primary/50 hover:bg-accent/20"
      >
        {file ? (
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <div className="shrink-0 text-muted-foreground">{icon}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium">{file.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatSize(file.size)}</p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded p-0.5 hover:bg-muted"
              onClick={(e) => { e.stopPropagation(); onClear(); }}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="shrink-0">{icon}</div>
            <div>
              <p className="text-xs">Click to select</p>
              {hint && <p className="text-[10px] text-muted-foreground/70">{hint}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────

export default function PackBeatUploader({ slots, onChange, disabled }: Props) {
  const { currentBeat, isPlaying, playBeat } = useAudioActions();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    slots.length > 0 && slots[slots.length - 1].status === "pending"
      ? slots.length - 1
      : null
  );

  const updateSlot = useCallback(
    (index: number, patch: Partial<BeatSlot>) => {
      onChange(
        slots.map((s, i) => {
          if (i !== index) return s;
          const updated = { ...s, ...patch };
          // Mark existing beats as dirty when metadata or files change
          if (
            s.existing &&
            s.status === "uploaded" &&
            !("dirty" in patch) &&
            !("saving" in patch) &&
            !("editing" in patch) &&
            !("previewProgress" in patch) &&
            !("masterProgress" in patch) &&
            !("stemsProgress" in patch) &&
            !("artworkProgress" in patch)
          ) {
            updated.dirty = true;
          }
          return updated;
        })
      );
    },
    [slots, onChange]
  );

  const saveExistingBeat = useCallback(
    async (index: number) => {
      const slot = slots[index];
      if (!slot.beatId || !slot.existing) return;

      onChange(
        slots.map((s, i) =>
          i === index
            ? { ...s, saving: true, previewProgress: 0, masterProgress: 0, stemsProgress: 0, artworkProgress: 0 }
            : s
        )
      );

      try {
        // Upload any new files first
        const hasNewFiles = slot.previewFile || slot.masterFile || slot.stemsFile || slot.artworkFile;
        let uploadedAssets: Record<string, { url: string; key: string }> | undefined;

        if (hasNewFiles) {
          const uploads = await Promise.all([
            slot.previewFile
              ? uploadFileWithPresign(slot.previewFile, "preview", slot.beatId, (pct) =>
                  onChange(slots.map((s, i) => (i === index ? { ...s, previewProgress: pct } : s)))
                )
              : Promise.resolve(undefined),
            slot.masterFile
              ? uploadFileWithPresign(slot.masterFile, "master", slot.beatId, (pct) =>
                  onChange(slots.map((s, i) => (i === index ? { ...s, masterProgress: pct } : s)))
                )
              : Promise.resolve(undefined),
            slot.stemsFile
              ? uploadFileWithPresign(slot.stemsFile, "stems", slot.beatId, (pct) =>
                  onChange(slots.map((s, i) => (i === index ? { ...s, stemsProgress: pct } : s)))
                )
              : Promise.resolve(undefined),
            slot.artworkFile
              ? uploadFileWithPresign(slot.artworkFile, "artwork", slot.beatId, (pct) =>
                  onChange(slots.map((s, i) => (i === index ? { ...s, artworkProgress: pct } : s)))
                )
              : Promise.resolve(undefined),
          ]);

          uploadedAssets = {};
          if (uploads[0]) uploadedAssets.preview = uploads[0];
          if (uploads[1]) uploadedAssets.master = uploads[1];
          if (uploads[2]) uploadedAssets.stems = uploads[2];
          if (uploads[3]) uploadedAssets.artwork = uploads[3];
        }

        const parsedTags = slot.tags
          ? slot.tags.split(",").map((t) => t.trim()).filter(Boolean)
          : [];

        const licensesPayload =
          slot.priceBasic || slot.pricePremium || slot.priceUnlimited
            ? {
                basic: slot.priceBasic ? { price: Number(slot.priceBasic) } : undefined,
                premium: slot.pricePremium ? { price: Number(slot.pricePremium) } : undefined,
                unlimited: slot.priceUnlimited ? { price: Number(slot.priceUnlimited) } : undefined,
              }
            : undefined;

        // Build update payload
        const updatePayload: Record<string, unknown> = {
          title: slot.title.trim(),
          description: slot.description.trim() || undefined,
          genre: slot.genre || undefined,
          bpm: slot.bpm ? Number(slot.bpm) : undefined,
          key: slot.key || undefined,
          mood: slot.mood || undefined,
          tags: parsedTags,
          licenses: licensesPayload,
        };

        // If files were re-uploaded, include the new URLs
        if (uploadedAssets) {
          updatePayload.uploadedAssets = uploadedAssets;
        }

        const res = await fetch(`/api/beats/${slot.beatId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to update beat");
        }

        onChange(
          slots.map((s, i) =>
            i === index
              ? {
                  ...s,
                  dirty: false,
                  saving: false,
                  editing: false,
                  previewFile: null,
                  masterFile: null,
                  stemsFile: null,
                  artworkFile: null,
                }
              : s
          )
        );
        toast.success(`"${slot.title}" updated`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Update failed";
        toast.error(message);
        onChange(
          slots.map((s, i) =>
            i === index ? { ...s, saving: false } : s
          )
        );
      }
    },
    [slots, onChange]
  );

  const removeSlot = useCallback(
    (index: number) => {
      const next = slots.filter((_, i) => i !== index);
      onChange(next);
      if (expandedIndex === index) setExpandedIndex(null);
      else if (expandedIndex !== null && expandedIndex > index)
        setExpandedIndex(expandedIndex - 1);
    },
    [slots, onChange, expandedIndex]
  );

  const addSlot = () => {
    const newSlots = [...slots, createEmptySlot()];
    onChange(newSlots);
    setExpandedIndex(newSlots.length - 1);
  };

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          Beats in This Pack
          <span className="ml-1.5 text-xs text-muted-foreground font-normal">
            ({slots.length} {slots.length === 1 ? "beat" : "beats"})
          </span>
        </Label>
      </div>

      {slots.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 py-10 text-muted-foreground">
          <Music className="h-8 w-8" />
          <p className="text-sm font-medium">No beats added yet</p>
          <p className="text-xs">Add beats to include in this pack</p>
        </div>
      )}

      {slots.map((slot, index) => {
        const isExpanded = expandedIndex === index;
        const isUploading = slot.status === "uploading";
        const isUploaded = slot.status === "uploaded";
        const hasError = slot.status === "error";
        const displayTitle = slot.title || `Beat #${index + 1}`;

        return (
          <div
            key={slot.clientId}
            className={`rounded-lg border transition-colors ${
              hasError
                ? "border-destructive/50 bg-destructive/5"
                : isUploaded
                  ? "border-green-500/30 bg-green-500/5"
                  : isUploading
                    ? "border-primary/30 bg-primary/5"
                    : "border-border/60 bg-background/50"
            }`}
          >
            {/* Collapsed header */}
            <button
              type="button"
              onClick={() => !isUploading && toggleExpand(index)}
              disabled={isUploading}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {slot.genre || "No genre"}
                  {slot.bpm ? ` · ${slot.bpm} BPM` : ""}
                  {slot.key ? ` · ${slot.key}` : ""}
                  {slot.mood ? ` · ${slot.mood}` : ""}
                  {isUploaded && slot.existing && " · Existing beat"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {isUploaded && !slot.dirty && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
                {isUploaded && slot.dirty && (
                  <Badge variant="outline" className="border-amber-500/50 text-[10px] text-amber-600">
                    Modified
                  </Badge>
                )}
                {slot.saving && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {isUploading && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {hasError && (
                  <Badge variant="destructive" className="text-[10px]">
                    Error
                  </Badge>
                )}
                {!isUploading &&
                  !isUploaded &&
                  slot.previewFile &&
                  slot.masterFile && (
                    <Badge variant="secondary" className="text-[10px]">
                      Ready
                    </Badge>
                  )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {/* Upload progress bars */}
            {(isUploading || (slot.saving && (slot.previewFile || slot.masterFile || slot.stemsFile || slot.artworkFile))) && (
              <div className="space-y-1 px-3 pb-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-12">Preview</span>
                  <Progress value={slot.previewProgress} className="h-1 flex-1" />
                  <span className="w-8 text-right">{slot.previewProgress}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-12">Master</span>
                  <Progress value={slot.masterProgress} className="h-1 flex-1" />
                  <span className="w-8 text-right">{slot.masterProgress}%</span>
                </div>
                {slot.stemsFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-12">Stems</span>
                    <Progress value={slot.stemsProgress} className="h-1 flex-1" />
                    <span className="w-8 text-right">{slot.stemsProgress}%</span>
                  </div>
                )}
                {slot.artworkFile && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-12">Artwork</span>
                    <Progress value={slot.artworkProgress} className="h-1 flex-1" />
                    <span className="w-8 text-right">{slot.artworkProgress}%</span>
                  </div>
                )}
              </div>
            )}

            {/* Error message */}
            {hasError && slot.errorMessage && (
              <p className="px-3 pb-2 text-xs text-destructive">
                {slot.errorMessage}
              </p>
            )}

            {/* Expanded — View mode (existing beats only) */}
            {isExpanded && !isUploading && isUploaded && slot.existing && !slot.editing && (() => {
              const isThisPlaying = currentBeat?.id === slot.beatId && isPlaying;

              return (
                <div className="space-y-3 border-t border-border/40 px-3 pb-3 pt-3">
                  {/* Play button + title row */}
                  {slot.previewUrl && (
                    <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          playBeat({
                            id: slot.beatId!,
                            title: slot.title,
                            producerName: "You",
                            previewUrl: slot.previewUrl,
                          })
                        }
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/90"
                      >
                        {isThisPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="ml-0.5 h-4 w-4" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{slot.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {slot.genre}{slot.bpm ? ` · ${slot.bpm} BPM` : ""}{slot.durationLabel ? ` · ${slot.durationLabel}` : ""}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Details grid */}
                  <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                    <div className="col-span-3">
                      <p className="text-[11px] font-medium text-muted-foreground">Title</p>
                      <p className="font-medium">{slot.title || "—"}</p>
                    </div>
                    <div className="col-span-3">
                      <p className="text-[11px] font-medium text-muted-foreground">Description</p>
                      <p className="text-xs text-muted-foreground">{slot.description || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Genre</p>
                      <p>{slot.genre || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">BPM</p>
                      <p>{slot.bpm || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Duration</p>
                      <p>{slot.durationLabel || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Key</p>
                      <p>{slot.key || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Mood</p>
                      <p>{slot.mood || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground">Tags</p>
                      <p>{slot.tags || "—"}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-xs"
                      onClick={() => updateSlot(index, { editing: true })}
                      disabled={disabled}
                    >
                      <Pencil className="h-3 w-3" />
                      Edit Beat
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => removeSlot(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Expanded — Edit mode (new beats always, existing beats after clicking edit) */}
            {isExpanded && !isUploading && (!isUploaded || !slot.existing || slot.editing) && (
              <div className="space-y-4 border-t border-border/40 px-3 pb-3 pt-3">
                {/* ── Metadata ── */}
                <div className="space-y-1">
                  <Label className="text-xs">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Beat title"
                    value={slot.title}
                    onChange={(e) => updateSlot(index, { title: e.target.value })}
                    disabled={disabled || slot.saving}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea
                    placeholder="Describe your beat..."
                    value={slot.description}
                    onChange={(e) =>
                      updateSlot(index, { description: e.target.value })
                    }
                    disabled={disabled || slot.saving}
                    rows={2}
                    maxLength={1000}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">
                      Genre <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={slot.genre}
                      onValueChange={(v) =>
                        v && updateSlot(index, { genre: v })
                      }
                      disabled={disabled || slot.saving}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent>
                        {GENRE_OPTIONS.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">BPM</Label>
                    <Input
                      type="number"
                      min={40}
                      max={300}
                      placeholder="e.g. 140"
                      value={slot.bpm}
                      onChange={(e) =>
                        updateSlot(index, { bpm: e.target.value })
                      }
                      disabled={disabled || slot.saving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Key</Label>
                    <Select
                      value={slot.key}
                      onValueChange={(v) => updateSlot(index, { key: v ?? "" })}
                      disabled={disabled || slot.saving}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select key" />
                      </SelectTrigger>
                      <SelectContent>
                        {KEY_OPTIONS.map((k) => (
                          <SelectItem key={k} value={k}>
                            {k}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mood</Label>
                    <Select
                      value={slot.mood}
                      onValueChange={(v) =>
                        updateSlot(index, { mood: v ?? "" })
                      }
                      disabled={disabled || slot.saving}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                      <SelectContent>
                        {MOOD_OPTIONS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tags (comma-separated)</Label>
                  <Input
                    placeholder="e.g. dark, melodic, piano"
                    value={slot.tags}
                    onChange={(e) =>
                      updateSlot(index, { tags: e.target.value })
                    }
                    disabled={disabled || slot.saving}
                  />
                </div>

                {/* Save / Cancel for existing beats */}
                {isUploaded && slot.existing && (
                  <div className="flex gap-2">
                    {(slot.dirty || slot.previewFile || slot.masterFile || slot.stemsFile || slot.artworkFile) && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="flex-1"
                        onClick={() => saveExistingBeat(index)}
                        disabled={disabled || slot.saving || !slot.title.trim()}
                      >
                        {slot.saving ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {slot.saving ? "Saving..." : "Save Changes"}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSlot(index, { editing: false })}
                      disabled={slot.saving}
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                {/* ── File uploads ── */}
                {(!isUploaded || slot.existing) && (
                  <>
                    <div className="pt-1">
                      <p className="text-xs font-medium text-muted-foreground">
                        {isUploaded && slot.existing
                          ? "Files — Select new files to replace existing ones. Leave empty to keep current files."
                          : "Files — Preview MP3 & Master WAV are required. Stems and Artwork are optional."}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FilePickerSlot
                        label="Preview MP3"
                        accept="audio/mpeg,audio/mp3,.mp3,application/zip,.zip"
                        file={slot.previewFile}
                        required={!isUploaded}
                        hint={isUploaded ? "Select to replace" : "Max 50 MB — MP3 or ZIP"}
                        icon={<Music className="h-4 w-4" />}
                        maxSize={MAX_SIZES.preview}
                        onSelect={(f) => updateSlot(index, { previewFile: f })}
                        onClear={() => updateSlot(index, { previewFile: null })}
                      />
                      <FilePickerSlot
                        label="Master WAV"
                        accept="audio/wav,audio/x-wav,.wav,application/zip,.zip"
                        file={slot.masterFile}
                        required={!isUploaded}
                        hint={isUploaded ? "Select to replace" : "Max 500 MB — WAV or ZIP"}
                        icon={<Music className="h-4 w-4" />}
                        maxSize={MAX_SIZES.master}
                        onSelect={(f) => updateSlot(index, { masterFile: f })}
                        onClear={() => updateSlot(index, { masterFile: null })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <FilePickerSlot
                        label="Stems ZIP"
                        accept="application/zip,.zip"
                        file={slot.stemsFile}
                        hint="Max 5 GB — optional"
                        icon={<FileArchive className="h-4 w-4" />}
                        maxSize={MAX_SIZES.stems}
                        onSelect={(f) => updateSlot(index, { stemsFile: f })}
                        onClear={() => updateSlot(index, { stemsFile: null })}
                      />
                      <FilePickerSlot
                        label="Artwork"
                        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                        file={slot.artworkFile}
                        hint="Max 5 MB — optional"
                        icon={<ImageIcon className="h-4 w-4" />}
                        maxSize={MAX_SIZES.artwork}
                        onSelect={(f) =>
                          updateSlot(index, { artworkFile: f })
                        }
                        onClear={() =>
                          updateSlot(index, { artworkFile: null })
                        }
                      />
                    </div>
                  </>
                )}

                {/* Remove button (for new beats only — existing beats have it in view mode) */}
                {!isUploaded && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      onClick={() => removeSlot(index)}
                      disabled={disabled}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={addSlot}
        disabled={disabled}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Add Beat
      </Button>
    </div>
  );
}
