"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSearchParams } from "next/navigation";
import { useAudioActions } from "@/components/AudioPlayerContext";
import PackImageCarousel from "./PackImageCarousel";
import PackInfoHeader from "./PackInfoHeader";
import PackInfoDescription from "./PackInfoDescription";
import PackTrackList from "./PackTrackList";
import PackPurchaseSection from "./PackPurchaseSection";
import PackMobileBar from "./PackMobileBar";
import type { BeatPackUi, PurchasedTierInfo } from "@/features/beats/beat-pack-ui";
import { packCartApi } from "@/lib/api/pack-cart";
import type { LicenseType } from "@/types";

interface Props {
  pack: BeatPackUi;
  isLoggedIn: boolean;
  hasPurchasedAll: boolean;
  ownedBeatCount: number;
  purchasedTier: PurchasedTierInfo | null;
}

// Fixed Syntax Error: Added generic angle brackets < > to Record
const TIER_EXTRA_FEATURES: Record<
  string,
  { contentId: boolean; streaming: boolean; stems: boolean; wav: boolean }
> = {
  basic: { contentId: false, streaming: true, stems: false, wav: false },
  premium: { contentId: false, streaming: true, stems: false, wav: true },
  unlimited: { contentId: false, streaming: true, stems: true, wav: true },
};

function getTierExtraFeatures(tier: string) {
  return (
    TIER_EXTRA_FEATURES[tier] ?? {
      contentId: false,
      streaming: true,
      stems: false,
      wav: false,
    }
  );
}

export default function BeatPackDetailClient({
  pack,
  isLoggedIn,
  hasPurchasedAll,
  ownedBeatCount,
  purchasedTier,
}: Props) {
  const searchParams = useSearchParams();
  const justPurchased = searchParams.get("purchased") === "1";
  const [selectedTier, setSelectedTier] = useState<LicenseType>("basic");
  const [addingToCart, setAddingToCart] = useState(false);
  const [inPackCart, setInPackCart] = useState(false);
  const { currentBeat } = useAudioActions();
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPageUrl(window.location.href);
    }
  }, []);

  const selectedTierPrice = useMemo(() => {
    const found = pack.prices?.find((price) => price.tier === selectedTier);
    return found?.price ?? pack.prices?.[0]?.price ?? 0;
  }, [pack.prices, selectedTier]);

  const selectedExtraFeatures = useMemo(
    () => getTierExtraFeatures(selectedTier),
    [selectedTier],
  );

  const upgradeOptions = useMemo(() => {
    if (!hasPurchasedAll || !purchasedTier || !pack.prices) return [];
    const tierRank: Record<string, number> = {
      basic: 0,
      premium: 1,
      unlimited: 2,
    };
    const currentRank = tierRank[purchasedTier.tier] ?? 0;
    const currentPrice =
      pack.prices.find((p) => p.tier === purchasedTier.tier)?.price ?? 0;
    return pack.prices
      .filter((p) => (tierRank[p.tier] ?? 0) > currentRank)
      .map((p) => ({
        tier: p.tier as "premium" | "unlimited",
        fullPrice: p.price,
        upgradePrice: p.price - currentPrice,
        features: getTierExtraFeatures(p.tier),
      }));
  }, [hasPurchasedAll, purchasedTier, pack.prices]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const hydrate = async () => {
      try {
        const response = await packCartApi.get();
        if (response?.items) {
          setInPackCart(response.items.some((item) => item.packId === pack.id));
        }
      } catch {
        // ignore
      }
    };
    hydrate();
  }, [isLoggedIn, pack.id]);

  const handleAddPackToCart = async () => {
    try {
      setAddingToCart(true);
      await packCartApi.add(pack.id, selectedTier);
      setInPackCart(true);
      toast.success("Beat pack added to cart");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to add pack to cart";
      toast.error(message);
    } finally {
      setAddingToCart(false);
    }
  };

  const coverUrl =
    (pack.imageUrls && pack.imageUrls.length > 0
      ? pack.imageUrls[0]
      : pack.coverUrl) ?? "";

  return (
    <div className={`page-shell lg:pb-0 ${currentBeat ? "pb-32" : "pb-20"}`}>
      <nav
        aria-label="Breadcrumb"
        className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <Link href="/" className="hover:text-foreground transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link
          href="/beat-packs"
          className="hover:text-foreground transition-colors"
        >
          Beat Packs
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">
          {pack.title}
        </span>
      </nav>

      {justPurchased && hasPurchasedAll && (
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-green-500/30 bg-green-500/5 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-400">
              Purchase successful!
            </p>
            <p className="text-xs text-muted-foreground">
              Click any track below to access your downloads, or visit your{" "}
              <Link
                href="/profile"
                className="underline hover:text-foreground"
              >
                profile
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        <PackPurchaseSection
          packId={pack.id}
          packTitle={pack.title}
          beatCount={pack.beatCount}
          prices={pack.prices}
          hasPurchasedAll={hasPurchasedAll}
          ownedBeatCount={ownedBeatCount}
          purchasedTier={purchasedTier}
          upgradeOptions={upgradeOptions}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          selectedTierPrice={selectedTierPrice}
          selectedExtraFeatures={selectedExtraFeatures}
          isLoggedIn={isLoggedIn}
          inPackCart={inPackCart}
          addingToCart={addingToCart}
          onAddToCart={handleAddPackToCart}
        />

        <div className="lg:order-first space-y-3 sm:space-y-5">
          <Card className="rounded-xl sm:rounded-2xl border-border/50 bg-card/80 shadow-sm overflow-hidden">
            <PackImageCarousel
              title={pack.title}
              coverUrl={pack.coverUrl}
              imageUrls={pack.imageUrls}
            />
            <PackInfoHeader pack={pack} pageUrl={pageUrl} />
          </Card>

          <PackTrackList
            tracks={pack.tracks}
            producerName={pack.producerName}
            coverUrl={coverUrl}
          />

          <PackInfoDescription
            description={pack.description}
          />
        </div>
      </div>

      {!hasPurchasedAll && (
        <PackMobileBar
          packId={pack.id}
          packTitle={pack.title}
          beatCount={pack.beatCount}
          prices={pack.prices}
          selectedTier={selectedTier}
          onSelectTier={setSelectedTier}
          selectedTierPrice={selectedTierPrice}
          selectedExtraFeatures={selectedExtraFeatures}
          isLoggedIn={isLoggedIn}
          inPackCart={inPackCart}
          addingToCart={addingToCart}
          onAddToCart={handleAddPackToCart}
          hasAudioPlaying={!!currentBeat}
        />
      )}
    </div>
  );
}