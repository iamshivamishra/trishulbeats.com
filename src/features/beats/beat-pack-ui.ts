export type PackTier = "basic" | "premium" | "unlimited";

export interface BeatPackTierPrice {
  tier: PackTier;
  price: number;
}

export interface BeatPackTrack {
  id: string;
  title: string;
  genre: string;
  bpm?: number;
  durationLabel: string;
  previewUrl?: string;
}

export interface BeatPackUi {
  id: string;
  title: string;
  description: string;
  coverUrl?: string;
  producerName: string;
  producerUsername: string;
  producerAvatarUrl?: string;
  tags: string[];
  beatCount: number;
  prices: BeatPackTierPrice[];
  tracks: BeatPackTrack[];
  status: "draft" | "published";
  updatedAtLabel: string;
}

export interface ProducerBeatOption {
  id: string;
  title: string;
  genre: string;
  bpm?: number;
  durationLabel: string;
  packId?: string;
  saleMode?: "single" | "pack_only";
  status?: "draft" | "published" | "archived";
  isPublished?: boolean;
}

