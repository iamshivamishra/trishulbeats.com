"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Download,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  type FileCategory,
  type UploadedAsset,
  MAX_SIZES,
  ALLOWED_FORMATS,
  formatSize,
  resolveContentType,
  uploadViaPresign,
} from "./pack-beat-uploader-types";
import { uploadMultipart, MULTIPART_THRESHOLD } from "@/lib/upload/multipart";

interface UploadSlotProps {
  label: string;
  category: FileCategory;
  producerId: string;
  beatId: string;
  required?: boolean;
  icon: React.ReactNode;
  uploadedFile: UploadedAsset | null;
  existingUrl?: string;
  onUploaded: (asset: UploadedAsset) => void;
  onClear: () => void;
  disabled?: boolean;
  audioPreview?: boolean;
  audioType?: string;
  imagePreview?: boolean;
  downloadable?: boolean;
}

export function PackUploadSlot({
  label,
  category,
  producerId,
  beatId,
  required,
  icon,
  uploadedFile,
  existingUrl,
  onUploaded,
  onClear,
  disabled,
  audioPreview,
  audioType = "audio/mpeg",
  imagePreview,
  downloadable,
}: UploadSlotProps) {
  const formats = ALLOWED_FORMATS[category];
  const hasExisting = !!existingUrl;
  const sizeHint = formatSize(MAX_SIZES[category]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (category === "stems" && !file.name.toLowerCase().endsWith(".zip")) {
      toast.error("Only ZIP files are allowed for stems");
      return;
    }

    setUploading(true);
    setProgress(0);
    try {
      let asset: UploadedAsset;
      if (file.size > MULTIPART_THRESHOLD) {
        const result = await uploadMultipart(file, {
          producerId, beatId, category,
          contentType: resolveContentType(file, category),
          onProgress: setProgress,
        });
        asset = { url: result.url, key: result.key, name: file.name, size: file.size };
      } else {
        asset = await uploadViaPresign(file, producerId, beatId, category, setProgress);
      }
      onUploaded(asset);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [producerId, beatId, category, onUploaded, usePresigned]);

  const statusBadge = uploadedFile ? (
    <Badge variant="outline" className="border-green-500/50 text-[10px] text-green-600">
      <CheckCircle2 className="mr-1 h-2.5 w-2.5" /> New Upload
    </Badge>
  ) : hasExisting ? (
    <Badge variant="outline" className="border-blue-500/30 text-[10px] text-blue-600">Current</Badge>
  ) : null;

  const acceptMap: Record<FileCategory, string> = {
    preview: ".mp3",
    master: ".wav",
    stems: ".zip",
    artwork: ".jpg,.jpeg,.png,.webp",
  };

  return (
    <div className={`rounded-lg border p-3 space-y-2 transition-colors ${
      uploadedFile ? "border-green-500/30 bg-green-500/5" : hasExisting ? "border-border/40 bg-background/80" : "border-dashed border-border/60 bg-muted/10"
    }`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="shrink-0">{icon}</div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium">{label}</span>
              {required ? (
                <Badge variant="outline" className="border-destructive/40 text-[9px] text-destructive px-1 py-0">Required</Badge>
              ) : (
                <Badge variant="outline" className="text-[9px] text-muted-foreground px-1 py-0">Optional</Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">Max {sizeHint} · {formats.join(", ").toUpperCase()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
          {downloadable && hasExisting && !uploadedFile && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs px-3"
              disabled={disabled}
              onClick={async () => {
                try {
                  const res = await fetch(`/api/studio/beats/${beatId}/presign-file?type=${category}`);
                  if (!res.ok) throw new Error("Failed to get download link");
                  const { url } = await res.json();
                  window.open(url, "_blank");
                } catch {
                  toast.error(`Failed to download ${label.toLowerCase()}`);
                }
              }}
            >
              <Download className="mr-1.5 h-3 w-3" /> Download
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptMap[category]}
            className="hidden"
            onChange={handleFileInputChange}
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant={uploadedFile || hasExisting ? "outline" : "default"}
            size="sm"
            className="h-8 text-xs px-3"
            disabled={disabled || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> {progress}%</>
            ) : (
              <><Upload className="mr-1.5 h-3 w-3" /> {uploadedFile || hasExisting ? "Replace" : "Upload"}</>
            )}
          </Button>
        </div>
      </div>

      {uploading && (
        <div className="space-y-1">
          <Progress value={progress} className="h-1.5" />
          <p className="text-[10px] text-muted-foreground">Uploading {label}... {progress}%</p>
        </div>
      )}

      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-md bg-green-500/10 border border-green-500/20 px-2.5 py-2 text-xs">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-green-700 dark:text-green-400">{uploadedFile.name}</p>
            <p className="text-[10px] text-green-600/70 dark:text-green-500/70">{formatSize(uploadedFile.size)} · Ready to save</p>
          </div>
          <button type="button" className="shrink-0 rounded-md p-1 hover:bg-green-500/20 transition" onClick={onClear}>
            <X className="h-3.5 w-3.5 text-green-600" />
          </button>
        </div>
      )}

      {audioPreview && hasExisting && !uploadedFile && (
        <audio controls preload="metadata" className="w-full h-9" key={existingUrl}>
          <source src={existingUrl} type={audioType} />
        </audio>
      )}

      {imagePreview && hasExisting && !uploadedFile && (
        <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-border/30">
          <NextImage src={existingUrl!} alt="Artwork" fill className="object-cover" sizes="80px" />
        </div>
      )}

      {!uploadedFile && !hasExisting && !uploading && (
        <p className="text-[11px] text-muted-foreground/60 italic pl-7">No file uploaded yet</p>
      )}
    </div>
  );
}
