"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Upload, Music, Image as ImageIcon, X,
  FileArchive, HardDrive, CheckCircle2, ChevronDown, IndianRupee,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { InputGroup, InputPrefix } from "@/components/ui/input-group";
import BeatMetadataFields, { type BeatMetadata } from "@/features/studio/BeatMetadataFields";

interface FileSlot {
  file: File | null;
  progress: number;
  status: "idle" | "uploading" | "done" | "error";
}

interface PresignedUploadPayload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  fields?: Record<string, string>;
}

type LicenseTier = "basic" | "premium" | "unlimited";

const MAX_SIZES: Record<string, number> = {
  preview: 20 * 1024 * 1024,
  master: 100 * 1024 * 1024,
  stems: 500 * 1024 * 1024,
  artwork: 5 * 1024 * 1024,
};

const LICENSE_INFO: Record<
  LicenseTier,
  { label: string; description: string; placeholder: string; color: string }
> = {
  basic: {
    label: "Basic License",
    description: "MP3 preview only, limited streams/sales, no stems included.",
    placeholder: "e.g. 29.99",
    color: "border-primary/30 bg-primary/5",
  },
  premium: {
    label: "Premium License",
    description: "WAV master included, higher stream/sales cap, no stems.",
    placeholder: "e.g. 59.99",
    color: "border-amber-500/30 bg-amber-500/5",
  },
  unlimited: {
    label: "Unlimited License",
    description: "WAV master + stems included, unlimited streams/sales.",
    placeholder: "e.g. 199.99",
    color: "border-violet-500/30 bg-violet-500/5",
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<BeatMetadata>({
    title: "", description: "", genre: "", bpm: "", key: "", mood: "", tags: "",
  });
  const updateMeta = useCallback(<K extends keyof BeatMetadata>(field: K, value: BeatMetadata[K]) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }, []);

  const [priceBasic, setPriceBasic] = useState("");
  const [pricePremium, setPricePremium] = useState("");
  const [priceUnlimited, setPriceUnlimited] = useState("");

  const [openLicense, setOpenLicense] = useState<LicenseTier | null>(null);

  const [preview, setPreview] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });
  const [master, setMaster] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });
  const [stems, setStems] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });
  const [artwork, setArtwork] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });

  const previewRef = useRef<HTMLInputElement>(null);
  const masterRef = useRef<HTMLInputElement>(null);
  const stemsRef = useRef<HTMLInputElement>(null);
  const artworkRef = useRef<HTMLInputElement>(null);

  const validateFileSize = useCallback((file: File, category: string): boolean => {
    const max = MAX_SIZES[category];
    if (max && file.size > max) {
      toast.error(`${file.name} exceeds the ${formatSize(max)} limit`);
      return false;
    }
    return true;
  }, []);

  const uploadWithPresignedTarget = useCallback(
    async (
      file: File,
      category: "preview" | "master" | "stems" | "artwork",
      beatId: string,
      setSlot: React.Dispatch<React.SetStateAction<FileSlot>>
    ): Promise<{ url: string; key: string }> => {
      setSlot((s) => ({ ...s, progress: 0, status: "uploading" }));

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
        let errorMessage = "Failed to create upload URL";
        try {
          const payload = await presignRes.json();
          errorMessage = payload?.error || errorMessage;
        } catch {
          // noop
        }
        throw new Error(errorMessage);
      }

      const target = (await presignRes.json()) as PresignedUploadPayload;

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setSlot((s) => ({ ...s, progress: pct, status: "uploading" }));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setSlot((s) => ({ ...s, progress: 100, status: "done" }));
            resolve();
            return;
          }
          reject(new Error(`Upload failed (${xhr.status})`));
        });

        xhr.addEventListener("error", () => reject(new Error("Network error while uploading")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        if (target.fields) {
          xhr.open("POST", target.uploadUrl);
          const cloudinaryData = new FormData();
          cloudinaryData.append("file", file);
          for (const [field, value] of Object.entries(target.fields)) {
            cloudinaryData.append(field, value);
          }
          xhr.send(cloudinaryData);
          return;
        }

        xhr.open("PUT", target.uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      return { url: target.publicUrl, key: target.key };
    },
    []
  );

  const doUpload = async (publishStatus: "draft" | "published") => {
    if (!preview.file || !master.file) {
      toast.error("Preview MP3 and Master WAV are required");
      return;
    }

    setLoading(true);

    try {
      const beatId = crypto.randomUUID();
      const [previewAsset, masterAsset, stemsAsset, artworkAsset] = await Promise.all([
        uploadWithPresignedTarget(preview.file, "preview", beatId, setPreview),
        uploadWithPresignedTarget(master.file, "master", beatId, setMaster),
        stems.file
          ? uploadWithPresignedTarget(stems.file, "stems", beatId, setStems)
          : Promise.resolve(undefined),
        artwork.file
          ? uploadWithPresignedTarget(artwork.file, "artwork", beatId, setArtwork)
          : Promise.resolve(undefined),
      ]);

      const payload = {
        title: meta.title,
        description: meta.description || undefined,
        genre: meta.genre,
        bpm: meta.bpm ? Number(meta.bpm) : undefined,
        key: meta.key || undefined,
        mood: meta.mood || undefined,
        tags: meta.tags
          ? meta.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean)
          : [],
        status: publishStatus,
        licenses:
          priceBasic || pricePremium || priceUnlimited
            ? {
                basic: priceBasic ? { price: Number(priceBasic) } : undefined,
                premium: pricePremium ? { price: Number(pricePremium) } : undefined,
                unlimited: priceUnlimited ? { price: Number(priceUnlimited) } : undefined,
              }
            : undefined,
        uploadedAssets: {
          preview: previewAsset,
          master: masterAsset,
          stems: stemsAsset,
          artwork: artworkAsset,
        },
      };

      const createRes = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errorPayload = await createRes.json().catch(() => null);
        throw new Error(errorPayload?.error || "Failed to create beat");
      }

      toast.success(
        publishStatus === "published" ? "Beat published!" : "Beat saved as draft"
      );
      router.push("/studio/beats");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
      setPreview((s) => ({ ...s, status: "error" }));
      setMaster((s) => ({ ...s, status: "error" }));
      setStems((s) => ({ ...s, status: "error" }));
      setArtwork((s) => ({ ...s, status: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doUpload("published");
  };

  const renderFileSlot = (
    label: string,
    accept: string,
    slot: FileSlot,
    setSlot: React.Dispatch<React.SetStateAction<FileSlot>>,
    ref: React.RefObject<HTMLInputElement>,
    category: string,
    icon: React.ReactNode,
    required = false,
    hint?: string
  ) => (
    <FormField label={label} required={required} optional={!required}>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] || null;
          if (f && !validateFileSize(f, category)) return;
          setSlot({ file: f, progress: 0, status: "idle" });
        }}
      />
      <div
        onClick={() => ref.current?.click()}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/60 p-4 transition-all hover:border-primary/50 hover:bg-accent/20 hover:shadow-sm"
      >
        <div className="flex size-10 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          {slot.file ? (
            <div>
              <p className="truncate text-sm font-medium">{slot.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(slot.file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Click to select</p>
              {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
            </div>
          )}
        </div>
        {slot.status === "done" && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
        )}
        {slot.file && slot.status === "idle" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              setSlot({ file: null, progress: 0, status: "idle" });
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {slot.status === "uploading" && (
        <Progress value={slot.progress} className="h-1.5" />
      )}
    </FormField>
  );

  const renderLicenseCard = (
    tier: LicenseTier,
    price: string,
    setPrice: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const info = LICENSE_INFO[tier];
    const isOpen = openLicense === tier;

    return (
      <div
        className={`rounded-xl border transition-all ${
          isOpen ? `${info.color} shadow-sm` : "border-border/60 bg-background/60"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpenLicense(isOpen ? null : tier)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-muted/50">
              <IndianRupee className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">{info.label}</p>
              <p className="text-xs text-muted-foreground">
                {price ? `₹${price}` : "Default pricing"}
              </p>
            </div>
          </div>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="space-y-3 border-t border-border/40 p-4 pt-3">
            <p className="text-xs text-muted-foreground">{info.description}</p>
            <FormField label={`${info.label} Price`} htmlFor={`price-${tier}`} optional>
              <InputGroup>
                <InputPrefix><IndianRupee /></InputPrefix>
                <Input
                  id={`price-${tier}`}
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder={info.placeholder}
                  autoFocus
                />
              </InputGroup>
            </FormField>
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Metadata */}
        <FormSection title="Beat Details" icon={<Upload />} description="Upload your beat files. Preview MP3 and Master WAV are required.">
          <BeatMetadataFields values={meta} onChange={updateMeta} />
        </FormSection>

        {/* License Pricing */}
        <FormSection
          title="License Pricing"
          icon={<IndianRupee />}
          description="Click a license to set a custom price — leave blank for default pricing"
        >
          <div className="space-y-3">
            {renderLicenseCard("basic", priceBasic, setPriceBasic)}
            {renderLicenseCard("premium", pricePremium, setPricePremium)}
            {renderLicenseCard("unlimited", priceUnlimited, setPriceUnlimited)}
          </div>
        </FormSection>

        {/* File uploads */}
        <FormSection
          title="Files"
          icon={<HardDrive />}
          description="MP3 (preview), WAV (master), ZIP (stems), JPEG/PNG/WebP (artwork)"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {renderFileSlot(
              "Preview MP3",
              "audio/mpeg,audio/mp3,.mp3",
              preview,
              setPreview,
              previewRef,
              "preview",
              <Music className="h-5 w-5" />,
              true,
              "Max 20 MB — tagged preview"
            )}

            {renderFileSlot(
              "Master WAV",
              "audio/wav,audio/x-wav,.wav",
              master,
              setMaster,
              masterRef,
              "master",
              <Music className="h-5 w-5" />,
              true,
              "Max 100 MB — untagged master"
            )}

            {renderFileSlot(
              "Stems ZIP",
              "application/zip,.zip",
              stems,
              setStems,
              stemsRef,
              "stems",
              <FileArchive className="h-5 w-5" />,
              false,
              "Max 500 MB — optional"
            )}

            {renderFileSlot(
              "Artwork",
              "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp",
              artwork,
              setArtwork,
              artworkRef,
              "artwork",
              <ImageIcon className="h-5 w-5" />,
              false,
              "Max 5 MB — optional"
            )}
          </div>
        </FormSection>

        <div className="flex gap-3 border-t border-border/40 pt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={loading}
            size="lg"
            onClick={() => doUpload("draft")}
          >
            Save as Draft
          </Button>
          <Button type="submit" className="flex-1" disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload &amp; Publish
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
