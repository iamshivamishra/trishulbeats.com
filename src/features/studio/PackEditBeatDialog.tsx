"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  FileArchive,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Loader2,
  Music,
  Save,
} from "lucide-react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import { type BeatSlot, type FileCategory, type UploadedAsset } from "./pack-beat-uploader-types";
import { PackUploadSlot } from "./PackUploadSlot";

interface EditBeatDialogProps {
  slot: BeatSlot;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (patch: Partial<BeatSlot>) => void;
  producerId: string;
}

export function PackEditBeatDialog({
  slot,
  open,
  onOpenChange,
  onComplete,
  producerId,
}: EditBeatDialogProps) {
  const isNew = !slot.existing;
  const beatId = slot.beatId || slot.clientId;

  const [title, setTitle] = useState(slot.title);
  const [description, setDescription] = useState(slot.description);
  const [genre, setGenre] = useState(slot.genre);
  const [bpm, setBpm] = useState(slot.bpm);
  const [keyVal, setKeyVal] = useState(slot.key);
  const [mood, setMood] = useState(slot.mood);
  const [tags, setTags] = useState(slot.tags);

  const [previewFile, setPreviewFile] = useState<UploadedAsset | null>(slot.previewFile);
  const [masterFile, setMasterFile] = useState<UploadedAsset | null>(slot.masterFile);
  const [stemsFile, setStemsFile] = useState<UploadedAsset | null>(slot.stemsFile);
  const [artworkFile, setArtworkFile] = useState<UploadedAsset | null>(slot.artworkFile);

  const [saving, setSaving] = useState(false);
  const [statusText, setStatusText] = useState("");

  const hasChanges =
    title !== slot.title || description !== slot.description ||
    genre !== slot.genre || bpm !== slot.bpm || keyVal !== slot.key ||
    mood !== slot.mood || tags !== slot.tags ||
    previewFile !== slot.previewFile || masterFile !== slot.masterFile ||
    stemsFile !== slot.stemsFile || artworkFile !== slot.artworkFile;

  const canSaveNew = isNew && title.trim() && genre && previewFile && masterFile;

  const artworkUrl = artworkFile?.url || slot.coverUrl;

  const handleSave = async () => {
    if (isNew) {
      onComplete({ title, description, genre, bpm, key: keyVal, mood, tags, previewFile, masterFile, stemsFile, artworkFile });
      return;
    }

    if (!slot.beatId) return;
    setSaving(true);

    try {
      const uploadedAssets: Record<string, { url: string; key: string }> = {};
      if (previewFile) uploadedAssets.preview = { url: previewFile.url, key: previewFile.key };
      if (masterFile) uploadedAssets.master = { url: masterFile.url, key: masterFile.key };
      if (stemsFile) uploadedAssets.stems = { url: stemsFile.url, key: stemsFile.key };
      if (artworkFile) uploadedAssets.artwork = { url: artworkFile.url, key: artworkFile.key };
      const hasNewFiles = Object.keys(uploadedAssets).length > 0;

      setStatusText("Saving beat...");

      const parsedTags = tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const licensesPayload =
        slot.priceBasic || slot.pricePremium || slot.priceUnlimited
          ? {
              basic: slot.priceBasic ? { price: Number(slot.priceBasic) } : undefined,
              premium: slot.pricePremium ? { price: Number(slot.pricePremium) } : undefined,
              unlimited: slot.priceUnlimited ? { price: Number(slot.priceUnlimited) } : undefined,
            }
          : undefined;

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        genre: genre || undefined,
        bpm: bpm ? Number(bpm) : undefined,
        key: keyVal || undefined,
        mood: mood || undefined,
        tags: parsedTags,
        licenses: licensesPayload,
      };
      if (hasNewFiles) payload.uploadedAssets = uploadedAssets;

      const res = await fetch(`/api/beats/${slot.beatId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update beat");
      }

      toast.success(`"${title}" updated`);
      onComplete({
        title, description, genre, bpm, key: keyVal, mood, tags,
        previewFile: null, masterFile: null, stemsFile: null, artworkFile: null,
        dirty: false, saving: false,
        previewUrl: uploadedAssets.preview?.url || slot.previewUrl,
        masterUrl: uploadedAssets.master?.url || slot.masterUrl,
        stemsUrl: uploadedAssets.stems?.url || slot.stemsUrl,
        coverUrl: uploadedAssets.artwork?.url || slot.coverUrl,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
      setSaving(false);
      setStatusText("");
    }
  };

  const fileSlots: {
    label: string;
    category: FileCategory;
    icon: React.ReactNode;
    required?: boolean;
    file: UploadedAsset | null;
    existingUrl: string;
    setFile: (a: UploadedAsset | null) => void;
    audioPreview?: boolean;
    audioType?: string;
    imagePreview?: boolean;
    downloadable?: boolean;
  }[] = [
    { label: "Preview MP3", category: "preview", icon: <Music className="h-4 w-4 text-primary" />, required: isNew, file: previewFile, existingUrl: slot.previewUrl, setFile: (a) => setPreviewFile(a), audioPreview: !isNew },
    { label: "Master WAV", category: "master", icon: <Music className="h-4 w-4 text-blue-500" />, required: isNew, file: masterFile, existingUrl: slot.masterUrl, setFile: (a) => setMasterFile(a), audioPreview: !isNew, audioType: "audio/wav" },
    { label: "Stems ZIP", category: "stems", icon: <FileArchive className="h-4 w-4 text-amber-500" />, file: stemsFile, existingUrl: slot.stemsUrl, setFile: (a) => setStemsFile(a), downloadable: true },
    { label: "Artwork", category: "artwork", icon: <ImageIcon className="h-4 w-4 text-purple-500" />, file: artworkFile, existingUrl: slot.coverUrl, setFile: (a) => setArtworkFile(a), imagePreview: !isNew },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40">
          <div className="flex items-start gap-3">
            {artworkUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-border/30 shadow-sm">
                <NextImage src={artworkUrl} alt="" fill className="object-cover" sizes="56px" />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10">
                <Music className="h-6 w-6 text-primary/60" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">{isNew ? "Add New Beat" : `Edit: ${slot.title || "Untitled"}`}</DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                {isNew ? "Upload audio files and fill in beat details." : "Update metadata or replace files."}
              </DialogDescription>
              {!isNew && (genre || bpm) && (
                <div className="flex items-center gap-1.5 mt-2">
                  {genre && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{genre}</Badge>}
                  {bpm && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{bpm} BPM</Badge>}
                  {slot.key && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{slot.key}</Badge>}
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="relative px-6 py-4">
          {saving && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium">{statusText || "Saving..."}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Please wait, do not close this dialog.</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Details</p>
                  <p className="text-[10px] text-muted-foreground">Beat title, genre, and other metadata</p>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-border/30 bg-muted/5 p-3">
                <div className="space-y-1">
                  <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
                  <Input placeholder="Beat title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Textarea placeholder="Describe your beat..." value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} rows={2} maxLength={1000} />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Genre <span className="text-destructive">*</span></Label>
                    <Select value={genre} onValueChange={(v) => v && setGenre(v)} disabled={saving}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select genre" /></SelectTrigger>
                      <SelectContent>{GENRE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">BPM</Label>
                    <Input type="number" min={40} max={300} placeholder="e.g. 140" value={bpm} onChange={(e) => setBpm(e.target.value)} disabled={saving} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Key</Label>
                    <Select value={keyVal} onValueChange={(v) => setKeyVal(v ?? "")} disabled={saving}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select key" /></SelectTrigger>
                      <SelectContent>{KEY_OPTIONS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Mood</Label>
                    <Select value={mood} onValueChange={(v) => setMood(v ?? "")} disabled={saving}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Select mood" /></SelectTrigger>
                      <SelectContent>{MOOD_OPTIONS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tags (comma-separated)</Label>
                  <Input placeholder="e.g. dark, melodic, piano" value={tags} onChange={(e) => setTags(e.target.value)} disabled={saving} />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 pb-1">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                  <HardDrive className="h-3.5 w-3.5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold">Files</p>
                  <p className="text-[10px] text-muted-foreground">
                    {isNew ? "Upload audio files. Preview MP3 & Master WAV are required." : "View or replace uploaded files."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {fileSlots.map((fs) => (
                  <PackUploadSlot
                    key={fs.category}
                    label={fs.label}
                    category={fs.category}
                    producerId={producerId}
                    beatId={beatId}
                    icon={fs.icon}
                    required={fs.required}
                    uploadedFile={fs.file}
                    existingUrl={fs.existingUrl}
                    onUploaded={(a) => fs.setFile(a)}
                    onClear={() => fs.setFile(null)}
                    disabled={saving}
                    audioPreview={fs.audioPreview}
                    audioType={fs.audioType}
                    imagePreview={fs.imagePreview}
                    downloadable={fs.downloadable}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-2 border-t border-border/40">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || (isNew ? !canSaveNew : !hasChanges)}>
            {saving ? (
              <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="mr-1.5 h-3.5 w-3.5" /> {isNew ? "Add Beat" : "Save Changes"}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
