"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, ImagePlus, Loader2, Save, X,
  Type, AlignLeft, IndianRupee, Tag, FileText, Images,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { InputGroup, InputPrefix, InputSuffix } from "@/components/ui/input-group";
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
  initialDisplayUrls?: Record<string, string>;
}

export default function BeatPackEditorForm({ mode, initialPack, producerId, initialDisplayUrls }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initialPack?.title ?? "");
  const [metadata, setMetadata] = useState(initialPack?.metadata ?? "");
  const [description, setDescription] = useState(initialPack?.description ?? "");
  const [imageUrls, setImageUrls] = useState<string[]>(() => {
    const urls = initialPack?.imageUrls ?? [];
    if (urls.length === 0 && initialPack?.coverUrl) return [initialPack.coverUrl];
    return urls;
  });
  const [displayUrls, setDisplayUrls] = useState<Record<string, string>>(initialDisplayUrls ?? {});
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
    return beatSlots.every((slot) => {
      if (slot.status === "uploaded") return true;
      return !!slot.title.trim() && !!slot.genre && !!slot.previewFile && !!slot.masterFile;
    });
  }, [title, basicPrice, premiumPrice, unlimitedPrice, submitting, beatSlots]);

  const updateSlotAtIndex = useCallback((index: number, patch: Partial<BeatSlot>) => {
    setBeatSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }, []);

  const addTag = () => {
    const value = tagInput.trim().replace(/^#/, "");
    if (value && !tags.includes(value) && tags.length < 10) {
      setTags((prev) => [...prev, value]);
      setTagInput("");
    }
  };

  const handleSubmit = async (publish: boolean) => {
    if (!canSubmit) {
      toast.error("Fill all required fields and add at least one beat with audio files.");
      return;
    }

    try {
      setSubmitting(true);

      const hasPending = beatSlots.some((s) => s.status !== "uploaded");
      let beatIds: string[];

      if (hasPending) {
        toast.info("Uploading beats...");
        beatIds = await uploadPendingBeats(beatSlots, updateSlotAtIndex);
      } else {
        beatIds = beatSlots.filter((s) => s.beatId).map((s) => s.beatId!);
      }

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

      <div className="mb-6">
        <h1 className="text-2xl font-semibold">
          {mode === "create" ? "Create Beat Pack" : "Edit Beat Pack"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === "create"
            ? "Bundle your beats into a pack with tiered pricing."
            : "Update your beat pack details and tracks."}
        </p>
      </div>

      <div className="space-y-6">
        {/* Details */}
        <FormSection title="Pack Details" icon={<Type />}>
          <div className="space-y-4">
            <FormField
              label="Pack Title"
              htmlFor="pack-title"
              required
              description="A memorable name for your beat pack"
            >
              <InputGroup>
                <InputPrefix><Type /></InputPrefix>
                <Input
                  id="pack-title"
                  placeholder="e.g. Midnight Drill Pack"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <InputSuffix>
                  <span className="text-xs tabular-nums">
                    {title.length}
                  </span>
                </InputSuffix>
              </InputGroup>
            </FormField>

            <FormField
              label="Metadata"
              htmlFor="pack-metadata"
              optional
              description="Additional info — shown to buyers on the pack page"
            >
              <div className="relative">
                <Textarea
                  id="pack-metadata"
                  rows={3}
                  placeholder="Additional metadata for this pack..."
                  value={metadata}
                  onChange={(e) => setMetadata(e.target.value)}
                  maxLength={2000}
                  className="pl-10"
                />
                <FileText className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              </div>
              <p className="text-right text-xs text-muted-foreground tabular-nums">{metadata.length}/2,000</p>
            </FormField>

            <FormField
              label="Description"
              htmlFor="pack-description"
              optional
              description="Describe the mood, usage, and style of this pack"
            >
              <div className="relative">
                <Textarea
                  id="pack-description"
                  rows={3}
                  placeholder="Describe mood, usage, and style of this pack..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="pl-10"
                />
                <AlignLeft className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              </div>
            </FormField>
          </div>
        </FormSection>

        {/* Gallery */}
        <FormSection
          title="Pack Images"
          icon={<Images />}
          description={`${imageUrls.length}/10 images — first image is the cover`}
        >
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
                const newDisplayMap: Record<string, string> = {};
                for (const file of files) {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await fetch("/api/beat-packs/upload-cover", { method: "POST", body: formData });
                  if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || `Failed to upload ${file.name}`);
                  }
                  const { url, displayUrl } = await res.json();
                  uploaded.push(url);
                  if (displayUrl) newDisplayMap[url] = displayUrl;
                }
                setImageUrls((prev) => [...prev, ...uploaded]);
                setDisplayUrls((prev) => ({ ...prev, ...newDisplayMap }));
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
                  <Image src={displayUrls[url] || url} alt={`Gallery image ${index + 1}`} fill sizes="120px" className="object-cover" unoptimized />
                  {index === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-primary/90 px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                      Cover
                    </span>
                  )}
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
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border/60 bg-muted/10 px-4 py-6 text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-muted/20"
            >
              {uploadingGallery ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <ImagePlus className="h-5 w-5" />
                  Add images (select multiple)
                </>
              )}
            </button>
          )}
          <p className="text-xs text-muted-foreground">JPG, PNG, or WebP — max 5 MB each</p>
        </FormSection>

        {/* Tier Pricing */}
        <FormSection
          title="Tier Pricing"
          icon={<IndianRupee />}
          description="Set the price for each license tier"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Basic" htmlFor="basic-price" required>
              <InputGroup>
                <InputPrefix><IndianRupee /></InputPrefix>
                <Input
                  id="basic-price"
                  placeholder="e.g. 499"
                  type="number"
                  min={1}
                  value={basicPrice}
                  onChange={(e) => setBasicPrice(e.target.value)}
                />
                <InputSuffix>
                  <span className="text-xs">INR</span>
                </InputSuffix>
              </InputGroup>
              <p className="text-xs text-muted-foreground">MP3 only</p>
            </FormField>

            <FormField label="Premium" htmlFor="premium-price" required>
              <InputGroup>
                <InputPrefix><IndianRupee /></InputPrefix>
                <Input
                  id="premium-price"
                  placeholder="e.g. 999"
                  type="number"
                  min={1}
                  value={premiumPrice}
                  onChange={(e) => setPremiumPrice(e.target.value)}
                />
                <InputSuffix>
                  <span className="text-xs">INR</span>
                </InputSuffix>
              </InputGroup>
              <p className="text-xs text-muted-foreground">MP3 + WAV</p>
            </FormField>

            <FormField label="Unlimited" htmlFor="unlimited-price" required>
              <InputGroup>
                <InputPrefix><IndianRupee /></InputPrefix>
                <Input
                  id="unlimited-price"
                  placeholder="e.g. 2999"
                  type="number"
                  min={1}
                  value={unlimitedPrice}
                  onChange={(e) => setUnlimitedPrice(e.target.value)}
                />
                <InputSuffix>
                  <span className="text-xs">INR</span>
                </InputSuffix>
              </InputGroup>
              <p className="text-xs text-muted-foreground">MP3 + WAV + Stems</p>
            </FormField>
          </div>
        </FormSection>

        {/* Tags */}
        <FormSection
          title="Tags"
          icon={<Tag />}
          description="Help buyers discover your pack — up to 10 tags"
        >
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
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
          )}
          <div className="flex gap-2">
            <InputGroup className="flex-1">
              <InputPrefix><Tag /></InputPrefix>
              <Input
                placeholder="e.g. drill, dark, melodic"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                disabled={tags.length >= 10}
              />
            </InputGroup>
            <Button
              type="button"
              variant="outline"
              onClick={addTag}
              disabled={!tagInput.trim() || tags.length >= 10}
            >
              Add
            </Button>
          </div>
          <p className="text-xs text-muted-foreground tabular-nums">{tags.length}/10 tags</p>
        </FormSection>

        {/* Beat Uploader */}
        <PackBeatUploader
          slots={beatSlots}
          onChange={setBeatSlots}
          disabled={submitting}
          producerId={producerId}
        />

        {/* Submit buttons */}
        <div className="flex flex-col gap-2 sm:flex-row border-t border-border/40 pt-4">
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
      </div>
    </div>
  );
}
