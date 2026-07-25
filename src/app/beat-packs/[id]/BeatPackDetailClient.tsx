"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, CirclePause, CirclePlay, Layers, Loader2, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAudioActions, useAudioProgress } from "@/components/AudioPlayerContext";
import ShareDialog from "@/components/ShareDialog";
import PackRazorpayButton from "@/components/PackRazorpayButton";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";
import { packCartApi } from "@/lib/api/pack-cart";
import type { LicenseType } from "@/types";

interface Props {
  pack: BeatPackUi;
  isLoggedIn: boolean;
  hasPurchasedAll: boolean;
  ownedBeatCount: number;
}

export default function BeatPackDetailClient({
  pack,
  isLoggedIn,
  hasPurchasedAll,
  ownedBeatCount,
}: Props) {
  const [selectedTier, setSelectedTier] = useState<LicenseType>("basic");
  const [addingToCart, setAddingToCart] = useState(false);
  const [inPackCart, setInPackCart] = useState(false);
  const { playBeat, currentBeat, isPlaying } = useAudioActions();
  const { progress, currentTime } = useAudioProgress();
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const selectedTierPrice = useMemo(() => {
    const found = pack.prices.find((price) => price.tier === selectedTier);
    return found?.price ?? pack.prices[0]?.price ?? 0;
  }, [pack.prices, selectedTier]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const hydrate = async () => {
      try {
        const response = await packCartApi.get();
        setInPackCart(response.items.some((item) => item.packId === pack.id));
      } catch {
        // ignore
      }
    };
    hydrate();
  }, [isLoggedIn, pack.id]);

  const handlePreviewToggle = (track: BeatPackUi["tracks"][number]) => {
    if (!track.previewUrl) {
      toast.info("Preview is not available for this track.");
      return;
    }
    playBeat({
      id: track.id,
      title: track.title,
      producerName: pack.producerName,
      coverUrl: pack.coverUrl,
      previewUrl: track.previewUrl,
    });
  };

  const formatElapsed = (seconds: number) => {
    const s = Math.floor(seconds);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const handleAddPackToCart = async () => {
    try {
      setAddingToCart(true);
      await packCartApi.add(pack.id, selectedTier);
      setInPackCart(true);
      toast.success("Beat pack added to cart");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add pack to cart";
      toast.error(message);
    } finally {
      setAddingToCart(false);
    }
  };

  const ownedLabel =
    ownedBeatCount === 0
      ? "You do not own any beat from this pack yet."
      : `You already own ${ownedBeatCount}/${pack.beatCount} beats from this pack.`;

  return (
    <div className="page-shell">
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link href="/beat-packs" className="hover:text-foreground transition-colors">Beat Packs</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{pack.title}</span>
      </nav>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm overflow-hidden">
            <div className="relative aspect-video w-full overflow-hidden border-b border-border/40 bg-muted/30">
              {pack.coverUrl ? (
                <Image
                  src={pack.coverUrl}
                  alt={pack.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Layers className="h-10 w-10 text-muted-foreground/50" />
                </div>
              )}
            </div>
            <div className="px-4 py-4 sm:px-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{pack.title}</h2>
                <Badge className="text-[11px]">{pack.beatCount} beats</Badge>
              </div>
              {pack.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{pack.description}</p>
              )}

              <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
                <Link
                  href={pack.producerUsername ? `/producer/${pack.producerUsername}` : "#"}
                  className="inline-flex items-center gap-2 rounded-lg transition hover:bg-accent px-1.5 py-1 -mx-1.5"
                >
                  <div className="relative h-7 w-7 overflow-hidden rounded-full bg-muted ring-1 ring-border/40">
                    {pack.producerAvatarUrl ? (
                      <Image src={pack.producerAvatarUrl} alt={pack.producerName} fill className="object-cover" sizes="28px" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                        {pack.producerName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{pack.producerName}</span>
                </Link>
                <div className="flex items-center gap-1.5">
                  {pack.tags.length > 0 && (
                    <div className="mr-1 hidden flex-wrap gap-1 sm:flex">
                      {pack.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px] px-1.5 py-0">
                          {tag}
                        </Badge>
                      ))}
                      {pack.tags.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{pack.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  <ShareDialog title={pack.title} url={pageUrl} />
                </div>
              </div>
            </div>
          </Card>

          <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Tracks in This Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {pack.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="rounded-lg border border-border/50 bg-background/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {index + 1}. {track.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {track.genre}
                        {track.bpm ? ` • ${track.bpm} BPM` : ""} • {track.durationLabel}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={currentBeat?.id === track.id && isPlaying ? "Pause preview" : "Play preview"}
                      onClick={() => handlePreviewToggle(track)}
                    >
                      {currentBeat?.id === track.id && isPlaying ? (
                        <CirclePause className="h-4 w-4" />
                      ) : (
                        <CirclePlay className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {currentBeat?.id === track.id && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="text-[10px] tabular-nums text-muted-foreground">{formatElapsed(currentTime)}</span>
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5 text-primary" />
                Buy Entire Pack
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">{ownedLabel}</p>

              <div className="grid grid-cols-3 gap-2">
                {pack.prices.map((tierPrice) => (
                  <button
                    key={tierPrice.tier}
                    type="button"
                    onClick={() => setSelectedTier(tierPrice.tier)}
                    className={`rounded-lg border p-2 text-left ${
                      selectedTier === tierPrice.tier
                        ? "border-primary bg-primary/10"
                        : "border-border/60 hover:bg-accent"
                    }`}
                  >
                    <p className="text-xs font-medium capitalize">{tierPrice.tier}</p>
                    <p className="text-sm font-bold">₹{tierPrice.price.toLocaleString("en-IN")}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-lg border border-border/60 overflow-hidden text-xs">
                <div className="grid grid-cols-4 bg-muted/30 px-2 py-1 font-medium">
                  <span>Feature</span>
                  <span className={`text-center ${selectedTier === "basic" ? "bg-primary/10 font-semibold border-t-2 border-primary" : ""}`}>Basic</span>
                  <span className={`text-center ${selectedTier === "premium" ? "bg-primary/10 font-semibold border-t-2 border-primary" : ""}`}>Premium</span>
                  <span className={`text-center ${selectedTier === "unlimited" ? "bg-primary/10 font-semibold border-t-2 border-primary" : ""}`}>Unlimited</span>
                </div>
                <div className="grid grid-cols-4 px-2 py-1">
                  <span>MP3</span>
                  <span className={`text-center ${selectedTier === "basic" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                  <span className={`text-center ${selectedTier === "premium" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                  <span className={`text-center ${selectedTier === "unlimited" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                </div>
                <div className="grid grid-cols-4 px-2 py-1">
                  <span>WAV</span>
                  <span className={`text-center ${selectedTier === "basic" ? "bg-primary/10 font-semibold" : ""}`}>No</span>
                  <span className={`text-center ${selectedTier === "premium" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                  <span className={`text-center ${selectedTier === "unlimited" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                </div>
                <div className="grid grid-cols-4 px-2 py-1">
                  <span>Stems</span>
                  <span className={`text-center ${selectedTier === "basic" ? "bg-primary/10 font-semibold" : ""}`}>No</span>
                  <span className={`text-center ${selectedTier === "premium" ? "bg-primary/10 font-semibold" : ""}`}>No</span>
                  <span className={`text-center ${selectedTier === "unlimited" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                </div>
                <div className="grid grid-cols-4 px-2 py-1">
                  <span>Commercial</span>
                  <span className={`text-center ${selectedTier === "basic" ? "bg-primary/10 font-semibold" : ""}`}>Limited</span>
                  <span className={`text-center ${selectedTier === "premium" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                  <span className={`text-center ${selectedTier === "unlimited" ? "bg-primary/10 font-semibold" : ""}`}>Yes</span>
                </div>
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                <p className="mb-2 font-medium">Includes</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    Access to all beats in this pack
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    One checkout for full collection
                  </li>
                </ul>
              </div>

              {hasPurchasedAll ? (
                <Button className="w-full" disabled>
                  You already own all beats
                </Button>
              ) : isLoggedIn ? (
                <div className="space-y-2">
                  <PackRazorpayButton
                    packId={pack.id}
                    tier={selectedTier}
                    amount={selectedTierPrice}
                    packTitle={pack.title}
                  />
                  {inPackCart ? (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/cart">
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        View Cart
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={handleAddPackToCart}
                      disabled={addingToCart}
                    >
                      {addingToCart ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Add Pack to Cart
                        </>
                      )}
                    </Button>
                  )}
                </div>
              ) : (
                <Button asChild className="w-full">
                  <Link href="/login">Sign in to Purchase</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

