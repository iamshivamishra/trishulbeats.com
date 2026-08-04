"use client";

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
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";

export interface BeatMetadata {
  title: string;
  description: string;
  genre: string;
  bpm: string;
  key: string;
  mood: string;
  tags: string;
}

interface BeatMetadataFieldsProps {
  values: BeatMetadata;
  onChange: <K extends keyof BeatMetadata>(field: K, value: BeatMetadata[K]) => void;
  showCharCount?: boolean;
}

export default function BeatMetadataFields({
  values,
  onChange,
  showCharCount = false,
}: BeatMetadataFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={values.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Beat title"
          required
          minLength={2}
          maxLength={100}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => onChange("description", e.target.value)}
          placeholder="Describe your beat..."
          maxLength={1000}
          rows={3}
        />
        {showCharCount && (
          <p className="text-right text-xs text-muted-foreground">
            {values.description.length}/1000
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="genre">Genre *</Label>
        <Select value={values.genre} onValueChange={(v) => v && onChange("genre", v)} required>
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
          value={values.bpm}
          onChange={(e) => onChange("bpm", e.target.value)}
          placeholder="e.g. 140"
          min={40}
          max={300}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="key">Key</Label>
        <Select value={values.key} onValueChange={(v) => onChange("key", v ?? "")}>
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
        <Select value={values.mood} onValueChange={(v) => onChange("mood", v ?? "")}>
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
          value={values.tags}
          onChange={(e) => onChange("tags", e.target.value)}
          placeholder="e.g. dark, melodic, piano"
        />
      </div>
    </div>
  );
}
