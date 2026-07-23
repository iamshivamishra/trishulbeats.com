import { requestJson } from "@/lib/api/http";

export interface MarketplaceBeatDto {
  _id: string;
  title: string;
  genre: string;
  bpm?: number;
  key?: string;
  mood?: string;
  duration: number;
  coverUrl?: string;
  plays: number;
  salesCount: number;
  tags: string[];
  startingPrice: number | null;
  producerName: string;
  producerUsername: string | null;
  saleMode?: "single" | "pack_only";
  createdAt: string;
}

export interface MarketplaceResponse {
  beats: MarketplaceBeatDto[];
  total: number;
  hasNext: boolean;
  page: number;
}

export const marketplaceApi = {
  list(query: string): Promise<MarketplaceResponse> {
    return requestJson<MarketplaceResponse>(`/api/marketplace?${query}`);
  },
};
