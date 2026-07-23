import { requestJson } from "@/lib/api/http";
import type { BeatPackCartItemPopulated, LicenseType } from "@/types";

interface PackCartResponse {
  items: BeatPackCartItemPopulated[];
  total: number;
  count: number;
}

export const packCartApi = {
  get(): Promise<PackCartResponse> {
    return requestJson<PackCartResponse>("/api/cart/packs");
  },

  add(packId: string, tier: LicenseType): Promise<{ message: string }> {
    return requestJson<{ message: string }>("/api/cart/packs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, tier }),
    });
  },

  updateTier(packId: string, tier: LicenseType): Promise<{ message: string }> {
    return requestJson<{ message: string }>(`/api/cart/packs/${packId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
  },

  remove(packId: string): Promise<{ message: string }> {
    return requestJson<{ message: string }>(`/api/cart/packs/${packId}`, { method: "DELETE" });
  },
};

