"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2, Save, Search, Trash2, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { BeatPackUi, ProducerBeatOption } from "@/features/beats/beat-pack-ui";

interface Props {
  mode: "create" | "edit";
  initialPack?: BeatPackUi;
}

export default function BeatPackEditorForm({ mode, initialPack }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPack?.title ?? "");
  const [description, setDescription] = useState(initialPack?.description ?? "");
  const [coverUrl, setCoverUrl] = useState(initialPack?.coverUrl ?? "");
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [basicPrice, setBasicPrice] = useState(
    initialPack?.prices.find((p) => p.tier === "basic")?.price.toString() ?? ""
  );
  const [premiumPrice, setPremiumPrice] = useState(
    initialPack?.prices.find((p) => p.tier === "premium")?.price.toString() ?? ""
  );
  const [unlimitedPrice, setUnlimitedPrice] = useState(
    initialPack?.prices.find((p) => p.tier === "unlimited")?.price.toString() ?? ""
  );
  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>(
    initialPack?.tracks.map((track) => track.id) ?? []
  );
  const [producerBeats, setProducerBeats] = useState<ProducerBeatOption[]>([]);
  const [search, setSearch] = useState("");
  const [showPublishedOnly, setShowPublishedOnly] = useState(false);
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
  const [loadingBeats, setLoadingBeats] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tags, setTags] = useState<string[]>(initialPack?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const canSubmit = useMemo(() => {
    return (
      !!title.trim() &&
      selectedBeatIds.length > 0 &&
      !!basicPrice &&
      !!premiumPrice &&
      !!unlimitedPrice &&
      !submitting
    );
  }, [title, selectedBeatIds.length, basicPrice, premiumPrice, unlimitedPrice, submitting]);

  const filteredBeats = useMemo(() => {
    const term = search.trim().toLowerCase();
    return producerBeats.filter((beat) => {
      if (showPublishedOnly && (!beat.isPublished || beat.status !== "published")) {
        return false;
      }
      if (showUnassignedOnly && beat.packId && beat.packId !== initialPack?.id) {
        return false;
      }
      if (!term) return true;
      const haystack = `${beat.title} ${beat.genre} ${beat.bpm ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [producerBeats, search, showPublishedOnly, showUnassignedOnly, initialPack?.id]);

  const selectedBeats = useMemo(() => {
    const map = new Map(producerBeats.map((beat) => [beat.id, beat]));
    return selectedBeatIds.map((id) => map.get(id)).filter(Boolean) as ProducerBeatOption[];
  }, [producerBeats, selectedBeatIds]);

  const bulkSelectableBeatIds = useMemo(
    () =>
      filteredBeats
        .filter((beat) => !(beat.packId && beat.packId !== initialPack?.id && beat.saleMode === "pack_only"))
        .map((beat) => beat.id),
    [filteredBeats, initialPack?.id]
  );

  useEffect(() => {
    const loadBeats = async () => {
      try {
        setLoadingBeats(true);
        const res = await fetch("/api/beat-packs/producer-beats");
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load beats");
        }
        const data = await res.json();
        setProducerBeats(
          (data.beats || []).map(
            (beat: {
              id: string;
              title: string;
              genre: string;
              bpm?: number;
              duration?: number;
              packId?: string;
              saleMode?: "single" | "pack_only";
              status?: "draft" | "published" | "archived";
              isPublished?: boolean;
            }) => ({
              id: beat.id,
              title: beat.title,
              genre: beat.genre,
              bpm: beat.bpm,
              durationLabel: beat.duration
                ? `${Math.floor(beat.duration / 60)}:${String(beat.duration % 60).padStart(2, "0")}`
                : "—",
              packId: beat.packId,
              saleMode: beat.saleMode,
              status: beat.status,
              isPublished: beat.isPublished,
            })
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to load beats";
        toast.error(message);
      } finally {
        setLoadingBeats(false);
      }
    };
    loadBeats();
  }, []);

  const toggleTrack = (beatId: string) => {
    setSelectedBeatIds((prev) =>
      prev.includes(beatId) ? prev.filter((id) => id !== beatId) : [...prev, beatId]
    );
  };

  const selectAllFiltered = () => {
    setSelectedBeatIds((prev) => Array.from(new Set([...prev, ...bulkSelectableBeatIds])));
  };

  const clearSelected = () => {
    setSelectedBeatIds([]);
  };

  const handleSubmit = async (publish: boolean) => {
    if (!canSubmit) {
      toast.error("Fill title, all tier prices, and select at least one beat.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        title,
        description: description || undefined,
        coverUrl: coverUrl.trim() || undefined,
        beatIds: selectedBeatIds,
        prices: {
          basic: Number(basicPrice),
          premium: Number(premiumPrice),
          unlimited: Number(unlimitedPrice),
        },
        tags,
        status: publish ? "published" : "draft",
      };
      const url =
        mode === "create" ? "/api/beat-packs" : `/api/beat-packs/${initialPack?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save beat pack");
      }

      toast.success(
        publish
          ? mode === "create"
            ? "Beat pack created and published."
            : "Beat pack updated and published."
          : mode === "create"
            ? "Beat pack saved as draft."
            : "Beat pack updated."
      );
      router.push("/studio/beat-packs");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save beat pack";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-shell max-w-4xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/studio/beat-packs")}>
        <ArrowLeft className="mr-1.5 h-4 w-4" />
        Back to Beat Packs
      </Button>

      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>{mode === "create" ? "Create Beat Pack" : "Edit Beat Pack"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="pack-title">Pack Title</Label>
            <Input
              id="pack-title"
              placeholder="Example: Midnight Drill Pack"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pack-description">Description</Label>
            <Textarea
              id="pack-description"
              rows={4}
              placeholder="Describe mood, usage, and style of this pack..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Pack Cover Image</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("Image must be under 5 MB");
                  return;
                }
                setUploadingCover(true);
                try {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("/api/beat-packs/upload-cover", {
                    method: "POST",
                    body: formData,
                  });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || "Upload failed");
                  }
                  const { url } = await res.json();
                  setCoverUrl(url);
                  toast.success("Cover image uploaded");
                } catch (error) {
                  const message = error instanceof Error ? error.message : "Upload failed";
                  toast.error(message);
                } finally {
                  setUploadingCover(false);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }
              }}
            />
            {coverUrl ? (
              <div className="relative mt-1 aspect-video w-full max-w-md overflow-hidden rounded-lg border border-border/60 bg-muted/30">
                <Image
                  src={coverUrl}
                  alt="Beat pack cover preview"
                  fill
                  sizes="(max-width: 768px) 100vw, 512px"
                  className="object-cover"
                />
                <div className="absolute right-2 top-2 flex gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8 bg-background/80 backdrop-blur-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCover}
                  >
                    {uploadingCover ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="mr-1.5 h-3.5 w-3.5" />}
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    className="h-8 w-8 bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive"
                    onClick={() => setCoverUrl("")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCover}
                className="flex w-full max-w-md flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 px-6 py-10 text-muted-foreground transition hover:border-primary/40 hover:bg-muted/30"
              >
                {uploadingCover ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm font-medium">Click to upload cover image</span>
                    <span className="text-xs">JPG, PNG, or WebP — max 5 MB</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div>
            <Label className="mb-2 block">Tier Pricing</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input
                placeholder="Basic Price (INR)"
                type="number"
                min={1}
                value={basicPrice}
                onChange={(event) => setBasicPrice(event.target.value)}
              />
              <Input
                placeholder="Premium Price (INR)"
                type="number"
                min={1}
                value={premiumPrice}
                onChange={(event) => setPremiumPrice(event.target.value)}
              />
              <Input
                placeholder="Unlimited Price (INR)"
                type="number"
                min={1}
                value={unlimitedPrice}
                onChange={(event) => setUnlimitedPrice(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  #{tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((_, i) => i !== index))}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag (e.g. drill, dark, melodic)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const value = tagInput.trim().replace(/^#/, "");
                    if (value && !tags.includes(value) && tags.length < 10) {
                      setTags((prev) => [...prev, value]);
                      setTagInput("");
                    }
                  }
                }}
                disabled={tags.length >= 10}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const value = tagInput.trim().replace(/^#/, "");
                  if (value && !tags.includes(value) && tags.length < 10) {
                    setTags((prev) => [...prev, value]);
                    setTagInput("");
                  }
                }}
                disabled={!tagInput.trim() || tags.length >= 10}
              >
                Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{tags.length}/10 tags. Press Enter or comma to add.</p>
          </div>

          <div>
            <Label className="mb-2 block">Select Beats for This Pack</Label>
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-background/50 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                placeholder="Search your beats by title/genre/BPM"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPublishedOnly((prev) => !prev)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  showPublishedOnly ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                Published only
              </button>
              <button
                type="button"
                onClick={() => setShowUnassignedOnly((prev) => !prev)}
                className={`rounded-full border px-3 py-1 text-xs ${
                  showUnassignedOnly ? "border-primary bg-primary/10 text-primary" : "border-border"
                }`}
              >
                Unassigned only
              </button>
              <Button type="button" variant="outline" size="sm" onClick={selectAllFiltered}>
                Select filtered
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelected}>
                Clear selection
              </Button>
              <span className="text-xs text-muted-foreground">
                {selectedBeatIds.length} selected
              </span>
            </div>
            {loadingBeats ? (
              <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
                Loading beats...
              </div>
            ) : (
              <div className="mb-3 grid gap-2 sm:grid-cols-2">
                {filteredBeats.map((beat) => {
                  const selected = selectedBeatIds.includes(beat.id);
                  const lockedByOtherPack =
                    !!beat.packId && beat.packId !== initialPack?.id && beat.saleMode === "pack_only";
                return (
                  <button
                    key={beat.id}
                    type="button"
                    onClick={() => !lockedByOtherPack && toggleTrack(beat.id)}
                    disabled={lockedByOtherPack}
                    className={`rounded-lg border p-2.5 text-left transition ${
                      selected
                        ? "border-primary bg-primary/10"
                        : lockedByOtherPack
                          ? "border-border bg-muted/40 opacity-60"
                          : "border-border bg-background/40 hover:bg-accent"
                    }`}
                  >
                    <p className="text-sm font-medium">{beat.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {beat.genre}
                      {beat.bpm ? ` • ${beat.bpm} BPM` : ""} • {beat.durationLabel}
                    </p>
                    {lockedByOtherPack && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Already assigned to another pack
                      </p>
                    )}
                    {!beat.isPublished && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Draft beat (publish before publishing this pack)
                      </p>
                    )}
                  </button>
                );
                })}
              </div>
            )}
            {selectedBeats.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedBeats.map((beat) => (
                  <Badge key={beat.id} variant="outline">
                    {beat.title}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="outline"
              className="sm:flex-1"
              onClick={() => handleSubmit(false)}
              disabled={!canSubmit}
            >
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Save className="mr-1.5 h-4 w-4" />}
              Save Draft
            </Button>
            <Button className="sm:flex-1" onClick={() => handleSubmit(true)} disabled={!canSubmit}>
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Publish Pack
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

