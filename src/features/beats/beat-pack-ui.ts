export type PackTier = "basic" | "premium" | "unlimited";

export interface BeatPackTierPrice {
  tier: PackTier;
  price: number;
}

export interface BeatPackTrack {
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
  durationLabel: string;
  previewUrl?: string;
}

export interface BeatPackUi {
  id: string;
  title: string;
  metadata?: string;
  description: string;
  coverUrl?: string;
  imageUrls?: string[];
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

export interface PurchasedTierInfo {
  tier: "basic" | "premium" | "unlimited";
  includesWav: boolean;
  includesStems: boolean;
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

