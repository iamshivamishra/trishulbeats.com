"use client";

import Link from "next/link";
import { Layers, Shield, ShoppingCart, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PackTierDialogContent from "./PackTierDialogContent";
import PackDownloadSection from "./PackDownloadSection";
import type { BeatPackTierPrice, PurchasedTierInfo } from "@/features/beats/beat-pack-ui";
import type { LicenseType } from "@/types";

interface UpgradeOption {
  tier: "premium" | "unlimited";
  fullPrice: number;
  upgradePrice: number;
  features: { wav: boolean; stems: boolean; contentId: boolean };
}

interface PackPurchaseSectionProps {
  packId: string;
  packTitle: string;
  beatCount: number;
  prices: BeatPackTierPrice[];
  hasPurchasedAll: boolean;
  ownedBeatCount: number;
  purchasedTier: PurchasedTierInfo | null;
  upgradeOptions: UpgradeOption[];
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
}

export default function PackPurchaseSection({
  packId,
  packTitle,
  beatCount,
  prices,
  hasPurchasedAll,
  ownedBeatCount,
  purchasedTier,
  upgradeOptions,
  selectedTier,
  onSelectTier,
  selectedTierPrice,
  selectedExtraFeatures,
  isLoggedIn,
  inPackCart,
  addingToCart,
  onAddToCart,
}: PackPurchaseSectionProps) {
  const ownedLabel =
    ownedBeatCount === 0
      ? "You do not own any beat from this pack yet."
      : `You already own ${ownedBeatCount}/${beatCount} beats from this pack.`;

  const minPrice = Math.min(...prices.map((p) => p.price));

  return (
    <div className="hidden lg:block lg:order-last lg:sticky lg:top-24 lg:self-start">
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 px-5 py-6 text-center">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              {beatCount} beats · Starting at
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-primary">
              ₹{minPrice.toLocaleString("en-IN")}
            </p>
            {beatCount > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                ₹{Math.round(minPrice / beatCount).toLocaleString("en-IN")} per
                beat
              </p>
            )}
          </div>

          <div className="space-y-2.5 px-5 pb-5">
            {!hasPurchasedAll && (
              <p className="text-xs text-muted-foreground">{ownedLabel}</p>
            )}

            {hasPurchasedAll ? (
              purchasedTier && (
                <PackDownloadSection
                  packId={packId}
                  packTitle={packTitle}
                  purchasedTier={purchasedTier}
                  upgradeOptions={upgradeOptions}
                />
              )
            ) : (
              <Dialog>
                <DialogTrigger className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg transition-all cursor-pointer">
                  <Zap className="h-4 w-4" />
                  Buy Pack — ₹{minPrice.toLocaleString("en-IN")}
                </DialogTrigger>
                <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
                  <DialogHeader className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-5">
                    <DialogTitle className="text-xl">
                      Choose Your Tier
                    </DialogTitle>
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
            )}

            {inPackCart && !hasPurchasedAll && (
              <Button
                asChild
                variant="outline"
                className="w-full rounded-xl"
                size="sm"
              >
                <Link href="/cart">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  View Cart
                </Link>
              </Button>
            )}

            <p className="text-center text-[11px] text-muted-foreground/60 pt-1">
              <Shield className="mr-1 inline h-3 w-3" />
              Secure checkout · Instant delivery
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
