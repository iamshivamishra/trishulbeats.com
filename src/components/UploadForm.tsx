"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Upload, Music, Image as ImageIcon, X,
  FileArchive, HardDrive, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";

interface FileSlot {
  file: File | null;
  progress: number;
  status: "idle" | "uploading" | "done" | "error";
}

const MAX_SIZES: Record<string, number> = {
  preview: 20 * 1024 * 1024,
  master: 100 * 1024 * 1024,
  stems: 500 * 1024 * 1024,
  artwork: 5 * 1024 * 1024,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState("");

  // Price fields (optional overrides for default license tiers)
  const [priceBasic, setPriceBasic] = useState("");
  const [pricePremium, setPricePremium] = useState("");
  const [priceUnlimited, setPriceUnlimited] = useState("");

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

  const doUpload = async (publishStatus: "draft" | "published") => {
    if (!preview.file || !master.file) {
      toast.error("Preview MP3 and Master WAV are required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      if (description) formData.append("description", description);
      formData.append("genre", genre);
      if (bpm) formData.append("bpm", bpm);
      if (key) formData.append("key", key);
      if (mood) formData.append("mood", mood);
      if (tags) formData.append("tags", tags);
      formData.append("status", publishStatus);

      // Optional license price overrides
      if (priceBasic || pricePremium || priceUnlimited) {
        formData.append(
          "licenses",
          JSON.stringify({
            basic: priceBasic ? { price: Number(priceBasic) } : undefined,
            premium: pricePremium ? { price: Number(pricePremium) } : undefined,
            unlimited: priceUnlimited ? { price: Number(priceUnlimited) } : undefined,
          })
        );
      }

      formData.append("audioTagged", preview.file);
      formData.append("audioFull", master.file);
      if (stems.file) formData.append("stems", stems.file);
      if (artwork.file) formData.append("cover", artwork.file);

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setPreview((s) => ({ ...s, progress: pct, status: "uploading" }));
            setMaster((s) => ({ ...s, progress: pct, status: "uploading" }));
            if (stems.file) setStems((s) => ({ ...s, progress: pct, status: "uploading" }));
            if (artwork.file) setArtwork((s) => ({ ...s, progress: pct, status: "uploading" }));
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setPreview((s) => ({ ...s, progress: 100, status: "done" }));
            setMaster((s) => ({ ...s, progress: 100, status: "done" }));
            setStems((s) => ({ ...s, progress: 100, status: "done" }));
            setArtwork((s) => ({ ...s, progress: 100, status: "done" }));
            resolve();
          } else {
            try {
              const err = JSON.parse(xhr.responseText);
              reject(new Error(err.error || "Upload failed"));
            } catch {
              reject(new Error("Upload failed"));
            }
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Network error")));
        xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

        xhr.open("POST", "/api/beats");
        xhr.send(formData);
      });

      await uploadPromise;
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
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
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
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/60 p-4 transition-colors hover:border-primary/50 hover:bg-accent/30"
      >
        <div className="shrink-0 text-muted-foreground">{icon}</div>
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
            className="h-6 w-6 shrink-0"
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
    </div>
  );

  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload Beat
        </CardTitle>
        <CardDescription>
          Upload your beat files. Preview MP3 and Master WAV are required.
          Stems and artwork are optional. Set your own license prices below —
          leave blank to use default pricing.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Metadata */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Beat title"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your beat..."
                maxLength={1000}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Select value={genre} onValueChange={(v) => v && setGenre(v)} required>
                <SelectTrigger id="genre">
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                placeholder="e.g. 140"
                min={40}
                max={300}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Select value={key} onValueChange={(v) => setKey(v ?? "")}>
                <SelectTrigger id="key">
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  {KEY_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mood">Mood</Label>
              <Select value={mood} onValueChange={(v) => setMood(v ?? "")}>
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. dark, melodic, piano"
              />
            </div>
          </div>

          {/* License Pricing */}
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              License Pricing
            </h3>
            <p className="text-xs text-muted-foreground">
              Leave blank to use default platform pricing for each tier.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="priceBasic">Basic License (₹)</Label>
              <Input
                id="priceBasic"
                type="number"
                min={0}
                step="0.01"
                value={priceBasic}
                onChange={(e) => setPriceBasic(e.target.value)}
                placeholder="e.g. 29.99"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pricePremium">Premium License (₹)</Label>
              <Input
                id="pricePremium"
                type="number"
                min={0}
                step="0.01"
                value={pricePremium}
                onChange={(e) => setPricePremium(e.target.value)}
                placeholder="e.g. 59.99"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priceUnlimited">Unlimited License (₹)</Label>
              <Input
                id="priceUnlimited"
                type="number"
                min={0}
                step="0.01"
                value={priceUnlimited}
                onChange={(e) => setPriceUnlimited(e.target.value)}
                placeholder="e.g. 199.99"
              />
            </div>
          </div>

          {/* File uploads */}
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="h-4 w-4 text-primary" />
              Files
            </h3>
            <p className="text-xs text-muted-foreground">
              Supported: MP3 (preview), WAV (master), ZIP (stems), JPEG/PNG/WebP (artwork)
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {renderFileSlot(
              "Preview MP3",
              "audio/mpeg,audio/mp3,.mp3",
              preview,
              setPreview,
              previewRef,
              "preview",
              <Music className="h-8 w-8" />,
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
              <Music className="h-8 w-8" />,
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
              <FileArchive className="h-8 w-8" />,
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
              <ImageIcon className="h-8 w-8" />,
              false,
              "Max 5 MB — optional"
            )}
          </div>

          <div className="flex gap-3">
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
        </CardContent>
      </form>
    </Card>
  );
}