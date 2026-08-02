// ─── Types ────────────────────────────────────────────────────────

export interface UploadedAsset {
  url: string;
  key: string;
  name: string;
  size: number;
}

export interface BeatSlot {
  clientId: string;
  beatId?: string;
  title: string;
  description: string;
  genre: string;
  bpm: string;
  key: string;
  mood: string;
  tags: string;
  priceBasic: string;
  pricePremium: string;
  priceUnlimited: string;
  durationLabel: string;
  previewUrl: string;
  masterUrl: string;
  stemsUrl: string;
  coverUrl: string;
  previewFile: UploadedAsset | null;
  masterFile: UploadedAsset | null;
  stemsFile: UploadedAsset | null;
  artworkFile: UploadedAsset | null;
  status: "pending" | "uploading" | "uploaded" | "error";
  errorMessage?: string;
  existing?: boolean;
  dirty?: boolean;
  saving?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────

export type FileCategory = "preview" | "master" | "stems" | "artwork";

export const MAX_SIZES: Record<FileCategory, number> = {
  preview: 50 * 1024 * 1024,
  master: 500 * 1024 * 1024,
  stems: 5 * 1024 * 1024 * 1024,
  artwork: 5 * 1024 * 1024,
};

export const ALLOWED_FORMATS: Record<FileCategory, string[]> = {
  preview: ["mp3"],
  master: ["wav"],
  stems: ["zip"],
  artwork: ["jpg", "jpeg", "png", "webp"],
};

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MIME_FALLBACKS: Record<FileCategory, string> = {
  preview: "audio/mpeg",
  master: "audio/wav",
  stems: "application/zip",
  artwork: "image/jpeg",
};

export function resolveContentType(file: File, category: FileCategory): string {
  if (file.type) return file.type;
  return MIME_FALLBACKS[category];
}

// ─── Slot factories ──────────────────────────────────────────────

const EMPTY_SLOT: Omit<BeatSlot, "clientId"> = {
  title: "", description: "", genre: "", bpm: "", key: "", mood: "", tags: "",
  priceBasic: "", pricePremium: "", priceUnlimited: "", durationLabel: "",
  previewUrl: "", masterUrl: "", stemsUrl: "", coverUrl: "",
  previewFile: null, masterFile: null, stemsFile: null, artworkFile: null,
  status: "pending",
};

export function createEmptySlot(): BeatSlot {
  return { clientId: crypto.randomUUID(), ...EMPTY_SLOT };
}

export function createExistingSlot(track: {
  id: string;
  title: string;
  description?: string;
  genre: string;
  bpm?: number;
  key?: string;
  mood?: string;
  tags?: string[];
  priceBasic?: number;
  pricePremium?: number;
  priceUnlimited?: number;
  durationLabel?: string;
  previewUrl?: string;
  masterUrl?: string;
  stemsUrl?: string;
  coverUrl?: string;
}): BeatSlot {
  return {
    clientId: crypto.randomUUID(),
    beatId: track.id,
    title: track.title,
    description: track.description ?? "",
    genre: track.genre,
    bpm: track.bpm?.toString() ?? "",
    key: track.key ?? "",
    mood: track.mood ?? "",
    tags: track.tags?.join(", ") ?? "",
    priceBasic: track.priceBasic?.toString() ?? "",
    pricePremium: track.pricePremium?.toString() ?? "",
    priceUnlimited: track.priceUnlimited?.toString() ?? "",
    durationLabel: track.durationLabel ?? "",
    previewUrl: track.previewUrl ?? "",
    masterUrl: track.masterUrl ?? "",
    stemsUrl: track.stemsUrl ?? "",
    coverUrl: track.coverUrl ?? "",
    previewFile: null,
    masterFile: null,
    stemsFile: null,
    artworkFile: null,
    status: "uploaded",
    existing: true,
  };
}

// ─── Beat creation (files already uploaded via widget) ───────────

export async function uploadPendingBeats(
  slots: BeatSlot[],
  onUpdate: (index: number, patch: Partial<BeatSlot>) => void
): Promise<string[]> {
  const beatIds: string[] = [];

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];

    if (slot.status === "uploaded" && slot.beatId) {
      beatIds.push(slot.beatId);
      continue;
    }

    if (!slot.previewFile || !slot.masterFile) {
      throw new Error(`Beat "${slot.title || `#${i + 1}`}" is missing required audio files`);
    }
    if (!slot.title.trim()) throw new Error(`Beat #${i + 1} is missing a title`);
    if (!slot.genre) throw new Error(`Beat "${slot.title}" is missing a genre`);

    onUpdate(i, { status: "uploading" });

    try {
      const parsedTags = slot.tags ? slot.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      const licensesPayload =
        slot.priceBasic || slot.pricePremium || slot.priceUnlimited
          ? {
              basic: slot.priceBasic ? { price: Number(slot.priceBasic) } : undefined,
              premium: slot.pricePremium ? { price: Number(slot.pricePremium) } : undefined,
              unlimited: slot.priceUnlimited ? { price: Number(slot.priceUnlimited) } : undefined,
            }
          : undefined;

      const res = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: slot.title.trim(),
          description: slot.description.trim() || undefined,
          genre: slot.genre,
          bpm: slot.bpm ? Number(slot.bpm) : undefined,
          key: slot.key || undefined,
          mood: slot.mood || undefined,
          tags: parsedTags,
          status: "published",
          licenses: licensesPayload,
          uploadedAssets: {
            preview: { url: slot.previewFile.url, key: slot.previewFile.key },
            master: { url: slot.masterFile.url, key: slot.masterFile.key },
            stems: slot.stemsFile ? { url: slot.stemsFile.url, key: slot.stemsFile.key } : undefined,
            artwork: slot.artworkFile ? { url: slot.artworkFile.url, key: slot.artworkFile.key } : undefined,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create beat");
      }

      const { beat } = await res.json();
      onUpdate(i, { status: "uploaded", beatId: beat?._id || beat?.id });
      beatIds.push(beat?._id || beat?.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      onUpdate(i, { status: "error", errorMessage: message });
      throw error;
    }
  }

  return beatIds;
}

export const STORAGE_PROVIDER = process.env.NEXT_PUBLIC_STORAGE_PROVIDER || "cloudinary";

// ─── Presigned upload via /api/upload/presign (S3/R2) ────────────

export async function uploadViaPresign(
  file: File,
  producerId: string,
  beatId: string,
  category: FileCategory,
  onProgress: (pct: number) => void,
): Promise<UploadedAsset> {
  const mime = resolveContentType(file, category);

  const res = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      producerId,
      beatId,
      category,
      contentType: mime,
      fileSize: file.size,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get presigned URL");
  }
  const { uploadUrl, publicUrl, key, fields } = await res.json();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ url: publicUrl, key, name: file.name, size: file.size });
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload network error"));

    if (fields) {
      xhr.open("POST", uploadUrl);
      const fd = new FormData();
      Object.entries(fields as Record<string, string>).forEach(([k, v]) => fd.append(k, v));
      fd.append("file", file);
      xhr.send(fd);
    } else {
      xhr.open("PUT", uploadUrl);
      xhr.setRequestHeader("Content-Type", mime);
      xhr.send(file);
    }
  });
}

// ─── Server-side upload for stems (Cloudinary 10 MB limit bypass) ─

export async function uploadStemsViaServer(
  file: File,
  producerId: string,
  beatId: string,
  onProgress: (pct: number) => void,
): Promise<UploadedAsset> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("producerId", producerId);
  formData.append("beatId", beatId);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/stems");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ url: data.url, key: data.key, name: file.name, size: file.size });
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        let msg = `Upload failed: ${xhr.status}`;
        try { msg = JSON.parse(xhr.responseText).error || msg; } catch { /* keep default */ }
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Upload network error"));
    xhr.send(formData);
  });
}

// ─── Beat card file status helpers ───────────────────────────────

export function getFileStatus(slot: BeatSlot) {
  const isExisting = slot.existing;
  return {
    mp3: isExisting ? !!slot.previewUrl : !!slot.previewFile,
    wav: isExisting ? !!slot.masterUrl : !!slot.masterFile,
    stems: isExisting ? !!slot.stemsUrl : !!slot.stemsFile,
    art: isExisting ? !!slot.coverUrl : !!slot.artworkFile,
  };
}
