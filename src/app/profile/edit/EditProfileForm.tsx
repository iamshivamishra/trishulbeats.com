"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import {
  Loader2, Camera, User, AtSign, FileText, Music,
  Globe, X, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FormField } from "@/components/ui/form-field";
import { FormSection } from "@/components/ui/form-section";
import { InputGroup, InputPrefix, InputSuffix } from "@/components/ui/input-group";
import { GENRE_OPTIONS } from "@/lib/validators/beat";
import type { IUser } from "@/types";

interface EditProfileFormProps {
  user: IUser;
}

export default function EditProfileForm({ user }: EditProfileFormProps) {
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const [displayName, setDisplayName] = useState(user.displayName || user.name);
  const [username, setUsername] = useState(user.username || "");
  const [bio, setBio] = useState(user.bio || "");
  const [genres, setGenres] = useState<string[]>(user.genres || []);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl || user.image || "");
  const [coverImageUrl, setCoverImageUrl] = useState(user.coverImageUrl || "");

  const [instagram, setInstagram] = useState(user.socialLinks?.instagram || "");
  const [youtube, setYoutube] = useState(user.socialLinks?.youtube || "");
  const [twitter, setTwitter] = useState(user.socialLinks?.twitter || "");
  const [website, setWebsite] = useState(user.socialLinks?.website || "");
  const [spotify, setSpotify] = useState(user.socialLinks?.spotify || "");
  const [soundcloud, setSoundcloud] = useState(user.socialLinks?.soundcloud || "");

  const initials = (displayName || user.name)
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleImageUpload = async (file: File, type: "avatar" | "cover") => {
    const setter = type === "avatar" ? setAvatarUploading : setCoverUploading;
    setter(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      const res = await fetch("/api/user/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Upload failed");
        return;
      }

      const { url } = await res.json();
      if (type === "avatar") setAvatarUrl(url);
      else setCoverImageUrl(url);

      toast.success(`${type === "avatar" ? "Avatar" : "Cover image"} updated`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setter(false);
    }
  };

  const toggleGenre = (genre: string) => {
    setGenres((prev) =>
      prev.includes(genre)
        ? prev.filter((g) => g !== genre)
        : prev.length >= 5
          ? prev
          : [...prev, genre]
    );
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName || undefined,
          username: username || undefined,
          bio: bio || undefined,
          genres: genres.length > 0 ? genres : undefined,
          socialLinks: {
            instagram,
            youtube,
            twitter,
            website,
            spotify,
            soundcloud,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save profile");
        return;
      }

      toast.success("Profile updated");
      router.refresh();
      if (username) {
        router.push(`/producer/${username}`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Edit Profile</h1>
        <p className="text-sm text-muted-foreground">
          Customize your public producer profile
        </p>
      </div>

      {/* Cover Image */}
      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-sm">
        <div className="relative h-40 w-full bg-gradient-to-br from-primary/30 via-primary/10 to-background sm:h-48">
          {coverImageUrl && (
            <Image
              src={coverImageUrl}
              alt="Cover"
              fill
              className="object-cover"
              sizes="(max-width: 672px) 100vw, 672px"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity hover:opacity-100">
            <input
              ref={coverRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "cover");
              }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => coverRef.current?.click()}
              disabled={coverUploading}
            >
              {coverUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Camera className="mr-2 h-4 w-4" />
              )}
              {coverImageUrl ? "Change Cover" : "Upload Cover"}
            </Button>
          </div>
        </div>

        {/* Avatar overlay */}
        <div className="relative -mt-12 px-6 pb-6">
          <div className="relative inline-block">
            <Avatar className="h-24 w-24 border-4 border-card">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary/20 text-primary text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, "avatar");
              }}
            />
            <button
              onClick={() => avatarRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground transition-colors hover:bg-primary/80"
              aria-label="Upload avatar"
            >
              {avatarUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Camera className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Basic Info */}
      <FormSection title="Basic Info" icon={<User />}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Display Name" htmlFor="displayName">
              <InputGroup>
                <InputPrefix><User /></InputPrefix>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your display name"
                  maxLength={60}
                />
                <InputSuffix>
                  <span className="text-xs tabular-nums">
                    {displayName.length}/60
                  </span>
                </InputSuffix>
              </InputGroup>
            </FormField>

            <FormField
              label="Username"
              htmlFor="username"
              description={username ? `trishulbeats.com/producer/${username}` : undefined}
            >
              <InputGroup>
                <InputPrefix><AtSign /></InputPrefix>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))
                  }
                  placeholder="your-username"
                  maxLength={30}
                />
              </InputGroup>
            </FormField>
          </div>

          <FormField
            label="Bio"
            htmlFor="bio"
            optional
            description="Tell the world about your sound"
          >
            <div className="relative">
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the world about your sound..."
                maxLength={500}
                rows={3}
                className="pl-10"
              />
              <FileText className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            </div>
            <p className="text-right text-xs text-muted-foreground tabular-nums">
              {bio.length}/500
            </p>
          </FormField>
        </div>
      </FormSection>

      {/* Genres */}
      <FormSection
        title="Genres"
        icon={<Music />}
        description="Select up to 5 genres you produce"
      >
        <div className="flex flex-wrap gap-2">
          {GENRE_OPTIONS.map((genre) => {
            const selected = genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                    : "border border-border bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {genre}
                {selected && <X className="h-3 w-3" />}
              </button>
            );
          })}
        </div>
        {genres.length >= 5 && (
          <p className="mt-2 text-xs text-muted-foreground">Maximum 5 genres selected</p>
        )}
      </FormSection>

      {/* Social Links */}
      <FormSection
        title="Social Links"
        icon={<Globe />}
        description="Connect your social profiles"
      >
        <div className="space-y-3">
          {[
            { icon: ExternalLink, label: "Instagram", value: instagram, set: setInstagram, placeholder: "https://instagram.com/you" },
            { icon: ExternalLink, label: "YouTube", value: youtube, set: setYoutube, placeholder: "https://youtube.com/@you" },
            { icon: ExternalLink, label: "Twitter / X", value: twitter, set: setTwitter, placeholder: "https://x.com/you" },
            { icon: Globe, label: "Website", value: website, set: setWebsite, placeholder: "https://yoursite.com" },
            { icon: Music, label: "Spotify", value: spotify, set: setSpotify, placeholder: "https://open.spotify.com/artist/..." },
            { icon: Music, label: "SoundCloud", value: soundcloud, set: setSoundcloud, placeholder: "https://soundcloud.com/you" },
          ].map(({ icon: Icon, label, value, set, placeholder }) => (
            <FormField key={label} label={label} optional>
              <InputGroup>
                <InputPrefix><Icon /></InputPrefix>
                <Input
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder={placeholder}
                />
              </InputGroup>
            </FormField>
          ))}
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t border-border/40 pt-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}
