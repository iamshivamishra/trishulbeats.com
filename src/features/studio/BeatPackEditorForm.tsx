"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2, Save, Trash2, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import PackBeatUploader, {
  type BeatSlot,
  createEmptySlot,
  createExistingSlot,
  uploadPendingBeats,
} from "@/features/studio/PackBeatUploader";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

interface Props {
  mode: "create" | "edit";
  initialPack?: BeatPackUi;
  producerId: string;
}

export default function BeatPackEditorForm({ mode, initialPack, producerId }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPack?.title ?? "");
  const [metadata, setMetadata] = useState(initialPack?.metadata ?? "");
  const [description, setDescription] = useState(initialPack?.description ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    const urls = initialPack?.imageUrls ?? [];
    if (urls.length === 0 && initialPack?.coverUrl) return [initialPack.coverUrl];
    return urls;
  });
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [basicPrice, setBasicPrice] = useState(
    initialPack?.prices.find((p) => p.tier === "basic")?.price.toString() ?? ""
  );
  const [premiumPrice, setPremiumPrice] = useState(
    initialPack?.prices.find((p) => p.tier === "premium")?.price.toString() ?? ""
  );
  const [unlimitedPrice, setUnlimitedPrice] = useState(
    initialPack?.prices.find((p) => p.tier === "unlimited")?.price.toString() ?? ""
  );
  const [tags, setTags] = useState<string[]>(initialPack?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Beat slots for the inline uploader
  const [beatSlots, setBeatSlots] = useState<BeatSlot[]>(() => {
    if (initialPack?.tracks && initialPack.tracks.length > 0) {
      return initialPack.tracks.map((track) => createExistingSlot(track));
    }
    return [createEmptySlot()];
  });

  const canSubmit = useMemo(() => {
    if (!title.trim() || !basicPrice || !premiumPrice || !unlimitedPrice || submitting) {
      return false;
    }
    if (beatSlots.length === 0) return false;
    // Every slot must either be already uploaded or have files ready
    return beatSlots.every((slot) => {
      if (slot.status === "uploaded") return true;
      return !!slot.title.trim() && !!slot.genre && !!slot.previewFile && !!slot.masterFile;
    });
  }, [title, basicPrice, premiumPrice, unlimitedPrice, submitting, beatSlots]);

  const updateSlotAtIndex = useCallback((index: number, patch: Partial<BeatSlot>) => {
    setBeatSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }, []);

  const handleSubmit = async (publish: boolean) => {
    if (!canSubmit) {
      toast.error("Fill all required fields and add at least one beat with audio files.");
      return;
    }

    try {
      setSubmitting(true);

      // 1. Upload any pending beats first
      const hasPending = beatSlots.some((s) => s.status !== "uploaded");
      let beatIds: string[];

      if (hasPending) {
        toast.info("Uploading beats...");
        beatIds = await uploadPendingBeats(beatSlots, updateSlotAtIndex);
      } else {
        beatIds = beatSlots.filter((s) => s.beatId).map((s) => s.beatId!);
      }

      // 2. Create or update the pack
      const payload = {
        title,
        metadata: metadata || undefined,
        description: description || undefined,
        coverUrl: imageUrls[0] || undefined,
        imageUrls,
        beatIds,
        prices: {
          basic: Number(basicPrice),
          premium: Number(premiumPrice),
          unlimited: Number(unlimitedPrice),
        },
        tags,
        status: publish ? "published" : "draft",
      };

      const url = mode === "create" ? "/api/beat-packs" : `/api/beat-packs/${initialPack?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save beat pack");
      }

      toast.success(
        publish
          ? mode === "create" ? "Beat pack created and published." : "Beat pack updated and published."
          : mode === "create" ? "Beat pack saved as draft." : "Beat pack updated."
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
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="pack-title">Pack Title</Label>
            <Input
              id="pack-title"
              placeholder="Example: Midnight Drill Pack"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Metadata */}
          <div className="space-y-2">
            <Label htmlFor="pack-metadata">Metadata</Label>
            <Textarea
              id="pack-metadata"
              rows={3}
              placeholder="Additional metadata for this pack..."
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              maxLength={2000}
            />
            <p className="text-right text-xs text-muted-foreground">{metadata.length}/2000</p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="pack-description">Description</Label>
            <Textarea
              id="pack-description"
              rows={3}
              placeholder="Describe mood, usage, and style of this pack..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Pack Images */}
          <div className="space-y-2">
            <Label>Pack Images <span className="text-xs text-muted-foreground">({imageUrls.length}/10 · first image is the cover)</span></Label>
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (files.length === 0) return;
                const remaining = 10 - imageUrls.length;
                if (files.length > remaining) {
                  toast.error(`You can add ${remaining} more image${remaining === 1 ? "" : "s"}`);
                  return;
                }
                const oversized = files.find((f) => f.size > 5 * 1024 * 1024);
                if (oversized) {
                  toast.error(`"${oversized.name}" exceeds 5 MB limit`);
                  return;
                }
                setUploadingGallery(true);
                try {
                  const uploaded: string[] = [];
                  for (const file of files) {
                    const formData = new FormData();
                    formData.append("file", file);
                    const res = await fetch("/api/beat-packs/upload-cover", { method: "POST", body: formData });
                    if (!res.ok) {
                      const err = await res.json().catch(() => ({}));
                      throw new Error(err.error || `Failed to upload ${file.name}`);
                    }
                    const { url } = await res.json();
                    uploaded.push(url);
                  }
                  setImageUrls((prev) => [...prev, ...uploaded]);
                  toast.success(`${uploaded.length} image${uploaded.length === 1 ? "" : "s"} uploaded`);
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Upload failed");
                } finally {
                  setUploadingGallery(false);
                  if (galleryInputRef.current) galleryInputRef.current.value = "";
                }
              }}
            />
            {imageUrls.length > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                {imageUrls.map((url, index) => (
                  <div key={index} className="group relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted/30">
                    <Image src={url} alt={`Gallery image ${index + 1}`} fill sizes="120px" className="object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrls((prev) => prev.filter((_, i) => i !== index))}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      aria-label={`Remove image ${index + 1}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {imageUrls.length < 10 && (
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploadingGallery}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/20 px-4 py-4 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-muted/30"
              >
                {uploadingGallery ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="h-4 w-4" />
                    Add images (select multiple)
                  </>
                )}
              </button>
            )}
            <p className="text-xs text-muted-foreground">JPG, PNG, or WebP — max 5 MB each. Up to 10 images.</p>
          </div>

          {/* Tier Pricing */}
          <div>
            <Label className="mb-2 block">Tier Pricing</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <Input placeholder="Basic Price (INR)" type="number" min={1} value={basicPrice} onChange={(e) => setBasicPrice(e.target.value)} />
              <Input placeholder="Premium Price (INR)" type="number" min={1} value={premiumPrice} onChange={(e) => setPremiumPrice(e.target.value)} />
              <Input placeholder="Unlimited Price (INR)" type="number" min={1} value={unlimitedPrice} onChange={(e) => setUnlimitedPrice(e.target.value)} />
            </div>
          </div>

          {/* Tags */}
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

          {/* Beat Uploader */}
          <PackBeatUploader
            slots={beatSlots}
            onChange={setBeatSlots}
            disabled={submitting}
            producerId={producerId}
          />

          {/* Submit buttons */}
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
