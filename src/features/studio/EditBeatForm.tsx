"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2, Save, ArrowLeft, Music, Eye, EyeOff, Trash2, Archive,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import LicenseEditor from "@/components/LicenseEditor";
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import type { IBeat, ILicense, BeatStatus } from "@/types";

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

  const [title, setTitle] = useState(beat.title);
  const [description, setDescription] = useState(beat.description || "");
  const [genre, setGenre] = useState(beat.genre);
  const [bpm, setBpm] = useState(beat.bpm?.toString() || "");
  const [key, setKey] = useState(beat.key || "");
  const [mood, setMood] = useState(beat.mood || "");
  const [tags, setTags] = useState(beat.tags.join(", "));
  const [status, setStatus] = useState<BeatStatus>(beat.status);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description: description || undefined,
        genre,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status,
        isPublished: status === "published",
      };
      if (bpm) body.bpm = Number(bpm);
      if (key) body.key = key;
      if (mood) body.mood = mood;

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
      {beat.coverUrl && (
        <div className="relative h-40 w-40 overflow-hidden rounded-xl">
          <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" sizes="160px" />
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
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Beat title"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your beat..."
              maxLength={1000}
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">
              {description.length}/1000
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={genre} onValueChange={(v) => v && setGenre(v)}>
                <SelectTrigger>
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
                min={40}
                max={300}
              />
            </div>

            <div className="space-y-2">
              <Label>Key</Label>
              <Select value={key} onValueChange={(v) => setKey(v ?? "")}>
                <SelectTrigger>
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
              <Label>Mood</Label>
              <Select value={mood} onValueChange={(v) => setMood(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. dark, melodic, piano"
            />
          </div>
        </CardContent>
      </Card>

      {/* Files info */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Files</CardTitle>
          <CardDescription>
            To replace files, delete this beat and re-upload.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-md bg-background p-3">
              <span className="text-muted-foreground">Preview MP3</span>
              <Badge variant="outline">{beat.audioTaggedUrl ? "Uploaded" : "Missing"}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background p-3">
              <span className="text-muted-foreground">Master WAV</span>
              <Badge variant="outline">{beat.audioFullUrl ? "Uploaded" : "Missing"}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-md bg-background p-3">
              <span className="text-muted-foreground">Stems ZIP</span>
              <Badge variant="outline">{beat.stemsUrl ? "Uploaded" : "Not provided"}</Badge>
            </div>
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
