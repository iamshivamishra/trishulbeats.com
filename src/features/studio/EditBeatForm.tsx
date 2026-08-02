"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2, Save, ArrowLeft, Music, Eye, EyeOff, Trash2, Archive,
  RefreshCw, FileArchive, ImageIcon, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LicenseEditor from "@/components/LicenseEditor";
import BeatMetadataFields, { type BeatMetadata } from "@/features/studio/BeatMetadataFields";
import type { IBeat, ILicense, BeatStatus } from "@/types";
import { uploadMultipart, MULTIPART_THRESHOLD } from "@/lib/upload/multipart";
import { STORAGE_PROVIDER, resolveContentType } from "./pack-beat-uploader-types";
import type { FileCategory } from "./pack-beat-uploader-types";

interface FileReplaceState {
  uploading: boolean;
  progress: number;
  done: boolean;
}

interface PresignedUploadPayload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  fields?: Record<string, string>;
}

const MAX_SIZES: Record<string, number> = {
  preview: 50 * 1024 * 1024,
  master: 500 * 1024 * 1024,
  stems: 5 * 1024 * 1024 * 1024,
  artwork: 5 * 1024 * 1024,
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface Props {
  beat: IBeat;
  licenses: ILicense[];
}

function statusLabel(status: BeatStatus) {
  switch (status) {
    case "published": return "Published";
    case "draft": return "Draft";
    case "archived": return "Archived";
    default: return status;
  }
}

export default function EditBeatForm({ beat, licenses }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [meta, setMeta] = useState<BeatMetadata>({
    title: beat.title,
    description: beat.description || "",
    genre: beat.genre,
    bpm: beat.bpm?.toString() || "",
    key: beat.key || "",
    mood: beat.mood || "",
    tags: beat.tags.join(", "),
  });
  const updateMeta = useCallback(<K extends keyof BeatMetadata>(field: K, value: BeatMetadata[K]) => {
    setMeta((prev) => ({ ...prev, [field]: value }));
  }, []);
  const [status, setStatus] = useState<BeatStatus>(beat.status);

  const [currentFiles, setCurrentFiles] = useState({
    audioTaggedUrl: beat.audioTaggedUrl,
    audioFullUrl: beat.audioFullUrl,
    stemsUrl: beat.stemsUrl,
    coverUrl: beat.coverUrl,
  });

  const defaultReplaceState: FileReplaceState = { uploading: false, progress: 0, done: false };
  const [replacePreview, setReplacePreview] = useState<FileReplaceState>(defaultReplaceState);
  const [replaceMaster, setReplaceMaster] = useState<FileReplaceState>(defaultReplaceState);
  const [replaceStems, setReplaceStems] = useState<FileReplaceState>(defaultReplaceState);
  const [replaceArtwork, setReplaceArtwork] = useState<FileReplaceState>(defaultReplaceState);

  const previewRef = useRef<HTMLInputElement>(null);
  const masterRef = useRef<HTMLInputElement>(null);
  const stemsRef = useRef<HTMLInputElement>(null);
  const artworkRef = useRef<HTMLInputElement>(null);

  const uploadAndReplace = useCallback(
    async (
      file: File,
      category: "preview" | "master" | "stems" | "artwork",
      setState: React.Dispatch<React.SetStateAction<FileReplaceState>>
    ) => {
      const max = MAX_SIZES[category];
      if (max && file.size > max) {
        toast.error(`${file.name} exceeds the ${formatSize(max)} limit`);
        return;
      }

      setState({ uploading: true, progress: 0, done: false });

      try {
        let uploadedUrl: string;
        let uploadedKey: string;
        const mime = resolveContentType(file, category as FileCategory);

        if ((STORAGE_PROVIDER === "s3" || STORAGE_PROVIDER === "r2") && file.size > MULTIPART_THRESHOLD) {
          const result = await uploadMultipart(file, {
            beatId: beat._id.toString(),
            category,
            contentType: mime,
            onProgress: (pct) => setState((s) => ({ ...s, progress: pct })),
          });
          uploadedUrl = result.url;
          uploadedKey = result.key;
        } else {
          const presignRes = await fetch("/api/upload/presign", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              beatId: beat._id.toString(),
              category,
              contentType: mime,
              fileSize: file.size,
            }),
          });

          if (!presignRes.ok) {
            const err = await presignRes.json().catch(() => null);
            throw new Error(err?.error || "Failed to get upload URL");
          }

          const target = (await presignRes.json()) as PresignedUploadPayload;

          await new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener("progress", (event) => {
              if (event.lengthComputable) {
                const pct = Math.round((event.loaded / event.total) * 100);
                setState((s) => ({ ...s, progress: pct }));
              }
            });
            xhr.addEventListener("load", () => {
              if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
                return;
              }
              reject(new Error(`Upload failed (${xhr.status})`));
            });
            xhr.addEventListener("error", () => reject(new Error("Network error")));

            if (target.fields) {
              xhr.open("POST", target.uploadUrl);
              const fd = new FormData();
              fd.append("file", file);
              for (const [k, v] of Object.entries(target.fields)) fd.append(k, v);
              xhr.send(fd);
            } else {
              xhr.open("PUT", target.uploadUrl);
              xhr.setRequestHeader("Content-Type", mime);
              xhr.send(file);
            }
          });

          uploadedUrl = target.publicUrl;
          uploadedKey = target.key;
        }

        const patchRes = await fetch(`/api/beats/${beat._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uploadedAssets: { [category]: { url: uploadedUrl, key: uploadedKey } },
          }),
        });

        if (!patchRes.ok) throw new Error("Failed to save file URL");

        setState({ uploading: false, progress: 100, done: true });
        const urlField =
          category === "preview" ? "audioTaggedUrl"
          : category === "master" ? "audioFullUrl"
          : category === "stems" ? "stemsUrl"
          : "coverUrl";
        setCurrentFiles((f) => ({ ...f, [urlField]: uploadedUrl }));
        toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} replaced`);
        setTimeout(() => setState(defaultReplaceState), 2000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        toast.error(msg);
        setState(defaultReplaceState);
      }
    },
    [beat._id, defaultReplaceState]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: meta.title,
        description: meta.description || undefined,
        genre: meta.genre,
        tags: meta.tags ? meta.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status,
        isPublished: status === "published",
      };
      if (meta.bpm) body.bpm = Number(meta.bpm);
      if (meta.key) body.key = meta.key;
      if (meta.mood) body.mood = meta.mood;

      const res = await fetch(`/api/beats/${beat._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
        return;
      }

      toast.success("Beat saved");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: BeatStatus) => {
    const res = await fetch(`/api/beats/${beat._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Failed to update status");
      return;
    }

    setStatus(newStatus);
    toast.success(
      newStatus === "published"
        ? "Beat published!"
        : newStatus === "draft"
          ? "Moved to drafts"
          : "Beat archived"
    );
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${beat.title}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/beats/${beat._id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
        return;
      }
      toast.success("Beat deleted");
      router.push("/studio/beats");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/studio/beats">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Edit Beat</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status === "published" ? "default" : "secondary"}>
                {statusLabel(status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {beat.plays.toLocaleString()} plays &middot; {beat.salesCount ?? 0} sales
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status !== "published" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("published")}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Publish
            </Button>
          )}
          {status === "published" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("draft")}
            >
              <EyeOff className="mr-1.5 h-4 w-4" />
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Artwork preview */}
      {currentFiles.coverUrl && (
        <div className="relative h-40 w-40 overflow-hidden rounded-xl">
          <Image src={currentFiles.coverUrl} alt={beat.title} fill className="object-cover" sizes="160px" />
        </div>
      )}

      {/* Metadata */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-5 w-5 text-primary" />
            Beat Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <BeatMetadataFields values={meta} onChange={updateMeta} showCharCount />
        </CardContent>
      </Card>

      {/* Files */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Files</CardTitle>
          <CardDescription>
            Preview your uploaded files and replace them individually.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Hidden file inputs */}
          <input ref={previewRef} type="file" accept="audio/mpeg,audio/mp3,.mp3" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndReplace(f, "preview", setReplacePreview); e.target.value = ""; }} />
          <input ref={masterRef} type="file" accept="audio/wav,audio/x-wav,.wav" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndReplace(f, "master", setReplaceMaster); e.target.value = ""; }} />
          <input ref={stemsRef} type="file" accept="application/zip,.zip" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndReplace(f, "stems", setReplaceStems); e.target.value = ""; }} />
          <input ref={artworkRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndReplace(f, "artwork", setReplaceArtwork); e.target.value = ""; }} />

          {/* Preview MP3 */}
          <div className="rounded-lg border border-border/40 bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Preview MP3</span>
              </div>
              <div className="flex items-center gap-2">
                {replacePreview.done && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <Badge variant="outline">{currentFiles.audioTaggedUrl ? "Uploaded" : "Missing"}</Badge>
                <Button variant="outline" size="sm" disabled={replacePreview.uploading}
                  onClick={() => previewRef.current?.click()}>
                  {replacePreview.uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  Replace
                </Button>
              </div>
            </div>
            {replacePreview.uploading && <Progress value={replacePreview.progress} className="h-1.5" />}
            {currentFiles.audioTaggedUrl && (
              <audio controls preload="metadata" className="w-full h-10" key={currentFiles.audioTaggedUrl}>
                <source src={currentFiles.audioTaggedUrl} type="audio/mpeg" />
              </audio>
            )}
          </div>

          {/* Master WAV */}
          <div className="rounded-lg border border-border/40 bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Master WAV</span>
              </div>
              <div className="flex items-center gap-2">
                {replaceMaster.done && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <Badge variant="outline">{currentFiles.audioFullUrl ? "Uploaded" : "Missing"}</Badge>
                <Button variant="outline" size="sm" disabled={replaceMaster.uploading}
                  onClick={() => masterRef.current?.click()}>
                  {replaceMaster.uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  Replace
                </Button>
              </div>
            </div>
            {replaceMaster.uploading && <Progress value={replaceMaster.progress} className="h-1.5" />}
            {currentFiles.audioFullUrl && (
              <audio controls preload="metadata" className="w-full h-10" key={currentFiles.audioFullUrl}>
                <source src={currentFiles.audioFullUrl} type="audio/wav" />
              </audio>
            )}
          </div>

          {/* Stems ZIP */}
          <div className="rounded-lg border border-border/40 bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileArchive className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Stems ZIP</span>
              </div>
              <div className="flex items-center gap-2">
                {replaceStems.done && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <Badge variant="outline">{currentFiles.stemsUrl ? "Uploaded" : "Not provided"}</Badge>
                <Button variant="outline" size="sm" disabled={replaceStems.uploading}
                  onClick={() => stemsRef.current?.click()}>
                  {replaceStems.uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  {currentFiles.stemsUrl ? "Replace" : "Upload"}
                </Button>
              </div>
            </div>
            {replaceStems.uploading && <Progress value={replaceStems.progress} className="h-1.5" />}
          </div>

          {/* Artwork */}
          <div className="rounded-lg border border-border/40 bg-background p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Artwork</span>
              </div>
              <div className="flex items-center gap-2">
                {replaceArtwork.done && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                <Badge variant="outline">{currentFiles.coverUrl ? "Uploaded" : "Not provided"}</Badge>
                <Button variant="outline" size="sm" disabled={replaceArtwork.uploading}
                  onClick={() => artworkRef.current?.click()}>
                  {replaceArtwork.uploading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                  {currentFiles.coverUrl ? "Replace" : "Upload"}
                </Button>
              </div>
            </div>
            {replaceArtwork.uploading && <Progress value={replaceArtwork.progress} className="h-1.5" />}
            {currentFiles.coverUrl && (
              <div className="relative h-24 w-24 overflow-hidden rounded-lg">
                <Image src={currentFiles.coverUrl} alt="Artwork" fill className="object-cover" sizes="96px" key={currentFiles.coverUrl} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Licenses */}
      <LicenseEditor licenses={licenses} beatId={beat._id.toString()} />

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {status !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("archived")}
            >
              <Archive className="mr-1.5 h-4 w-4" />
              Archive
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Delete Beat
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
