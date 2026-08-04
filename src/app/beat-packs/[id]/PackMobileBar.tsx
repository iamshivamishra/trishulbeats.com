"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PackTierDialogContent from "./PackTierDialogContent";
import type { BeatPackTierPrice } from "@/features/beats/beat-pack-ui";
import type { LicenseType } from "@/types";

interface PackMobileBarProps {
  packId: string;
  packTitle: string;
  beatCount: number;
  prices: BeatPackTierPrice[];
  selectedTier: LicenseType;
  onSelectTier: (tier: LicenseType) => void;
  selectedTierPrice: number;
  selectedExtraFeatures: {
    contentId: boolean;
    streaming: boolean;
    stems: boolean;
    wav: boolean;
  };
  isLoggedIn: boolean;
  inPackCart: boolean;
  addingToCart: boolean;
  onAddToCart: () => void;
  hasAudioPlaying: boolean;
}

export default function PackMobileBar({
  packId,
  packTitle,
  beatCount,
  prices,
  selectedTier,
  onSelectTier,
  selectedTierPrice,
  selectedExtraFeatures,
  isLoggedIn,
  inPackCart,
  addingToCart,
  onAddToCart,
  hasAudioPlaying,
}: PackMobileBarProps) {
  const [stickyDialogOpen, setStickyDialogOpen] = useState(false);
  const minPrice = Math.min(...prices.map((p) => p.price));

  return (
    <div
      className={`fixed inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden transition-[bottom] duration-200 ${hasAudioPlaying ? "bottom-[60px]" : "bottom-0"}`}
    >
      <div className="mx-auto flex max-w-lg items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{packTitle}</p>
          <p className="text-xs text-muted-foreground">
            From{" "}
            <span className="font-bold text-primary">
              ₹{minPrice.toLocaleString("en-IN")}
            </span>
          </p>
        </div>
        <Dialog open={stickyDialogOpen} onOpenChange={setStickyDialogOpen}>
          <DialogTrigger className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer">
            <Zap className="h-4 w-4" />
            Buy Now
          </DialogTrigger>
          <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
            <DialogHeader className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-5">
              <DialogTitle className="text-xl">Choose Your Tier</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {packTitle} · {beatCount} beats
              </p>
            </DialogHeader>
            <PackTierDialogContent
              prices={prices}
              beatCount={beatCount}
              packId={packId}
              packTitle={packTitle}
              selectedTier={selectedTier}
              onSelectTier={onSelectTier}
              selectedTierPrice={selectedTierPrice}
              selectedExtraFeatures={selectedExtraFeatures}
              isLoggedIn={isLoggedIn}
              inPackCart={inPackCart}
              addingToCart={addingToCart}
              onAddToCart={onAddToCart}
            />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
