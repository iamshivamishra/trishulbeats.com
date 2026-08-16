"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import { InputGroup, InputPrefix, InputSuffix } from "@/components/ui/input-group";
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import { Music, Hash, Piano, Smile, Tag, Type, AlignLeft } from "lucide-react";

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
    <div className="grid gap-5 sm:grid-cols-2">
      <FormField
        label="Title"
        htmlFor="title"
        required
        description="A catchy name for your beat"
        className="sm:col-span-2"
      >
        <InputGroup>
          <InputPrefix><Type /></InputPrefix>
          <Input
            id="title"
            value={values.title}
            onChange={(e) => onChange("title", e.target.value)}
            placeholder="e.g. Midnight Raga, Dark Trap Soul"
            required
            minLength={2}
            maxLength={100}
          />
          <InputSuffix>
            <span className="text-xs tabular-nums">
              {values.title.length}/100
            </span>
          </InputSuffix>
        </InputGroup>
      </FormField>

      <FormField
        label="Description"
        htmlFor="description"
        optional
        description="Tell buyers what makes this beat special"
        className="sm:col-span-2"
      >
        <div className="relative">
          <Textarea
            id="description"
            value={values.description}
            onChange={(e) => onChange("description", e.target.value)}
            placeholder="Describe the vibe, instruments, and who this beat is perfect for..."
            maxLength={1000}
            rows={3}
            className="pl-10"
          />
          <AlignLeft className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
        </div>
        {showCharCount && (
          <p className="text-right text-xs text-muted-foreground tabular-nums">
            {values.description.length}/1,000
          </p>
        )}
      </FormField>

      <FormField
        label="Genre"
        htmlFor="genre"
        required
        description="Primary genre for marketplace filters"
      >
        <div className="relative">
          <Select value={values.genre} onValueChange={(v) => v && onChange("genre", v)} required>
            <SelectTrigger id="genre" className="pl-10">
              <SelectValue placeholder="Select genre" />
            </SelectTrigger>
            <SelectContent>
              {GENRE_OPTIONS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Music className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </FormField>

      <FormField
        label="BPM"
        htmlFor="bpm"
        optional
        description="Tempo in beats per minute"
      >
        <InputGroup>
          <InputPrefix><Hash /></InputPrefix>
          <Input
            id="bpm"
            type="number"
            value={values.bpm}
            onChange={(e) => onChange("bpm", e.target.value)}
            placeholder="e.g. 140"
            min={40}
            max={300}
          />
          <InputSuffix>
            <span className="text-xs text-muted-foreground">BPM</span>
          </InputSuffix>
        </InputGroup>
      </FormField>

      <FormField
        label="Key"
        htmlFor="key"
        optional
        description="Musical key signature"
      >
        <div className="relative">
          <Select value={values.key} onValueChange={(v) => onChange("key", v ?? "")}>
            <SelectTrigger id="key" className="pl-10">
              <SelectValue placeholder="Select key" />
            </SelectTrigger>
            <SelectContent>
              {KEY_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>{k}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Piano className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </FormField>

      <FormField
        label="Mood"
        htmlFor="mood"
        optional
        description="Overall feel of the beat"
      >
        <div className="relative">
          <Select value={values.mood} onValueChange={(v) => onChange("mood", v ?? "")}>
            <SelectTrigger id="mood" className="pl-10">
              <SelectValue placeholder="Select mood" />
            </SelectTrigger>
            <SelectContent>
              {MOOD_OPTIONS.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Smile className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </FormField>

      <FormField
        label="Tags"
        htmlFor="tags"
        optional
        description="Comma-separated keywords to help buyers find your beat"
        className="sm:col-span-2"
      >
        <InputGroup>
          <InputPrefix><Tag /></InputPrefix>
          <Input
            id="tags"
            value={values.tags}
            onChange={(e) => onChange("tags", e.target.value)}
            placeholder="e.g. dark, melodic, piano, cinematic"
          />
        </InputGroup>
      </FormField>
    </div>
  );
}
