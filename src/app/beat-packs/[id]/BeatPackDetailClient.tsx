"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Check, ChevronLeft, ChevronRight, CirclePause, CirclePlay, Crown, Infinity, Layers,
  Loader2, Music, Shield, ShoppingCart, Sparkles, X, Zap,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

// Extra "What You Get" flags per license tier — Content ID / Exclusive Rights
// is only granted on Unlimited, while streaming-platform distribution is
// included across all tiers.
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
    TIER_EXTRA_FEATURES[tier] ?? { contentId: false, streaming: true, stems: false, wav: false }
  );
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

  const [stickyDialogOpen, setStickyDialogOpen] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  // Lightbox swipe/drag refs
  const lightboxTouchStartX = useRef(0);
  const lightboxTouchDeltaX = useRef(0);
  const lightboxMouseDown = useRef(false);
  const lightboxMouseStartX = useRef(0);
  const lightboxMouseDeltaX = useRef(0);

  const allImages = useMemo(() => {
    const imgs = [...(pack.imageUrls ?? [])];
    if (imgs.length === 0 && pack.coverUrl) imgs.push(pack.coverUrl);
    return imgs;
  }, [pack.imageUrls, pack.coverUrl]);

  const goToPrev = useCallback(() => setCarouselIndex((i) => Math.max(0, i - 1)), []);
  const goToNext = useCallback(() => setCarouselIndex((i) => Math.min(allImages.length - 1, i + 1)), [allImages.length]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current > 50) goToPrev();
    else if (touchDeltaX.current < -50) goToNext();
    touchDeltaX.current = 0;
  }, [goToPrev, goToNext]);

  // ====== Lightbox touch swipe ======
  const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
    lightboxTouchStartX.current = e.touches[0].clientX;
    lightboxTouchDeltaX.current = 0;
  }, []);

  const handleLightboxTouchMove = useCallback((e: React.TouchEvent) => {
    lightboxTouchDeltaX.current = e.touches[0].clientX - lightboxTouchStartX.current;
  }, []);

  const handleLightboxTouchEnd = useCallback(() => {
    if (lightboxTouchDeltaX.current > 50) goToPrev();
    else if (lightboxTouchDeltaX.current < -50) goToNext();
    lightboxTouchDeltaX.current = 0;
  }, [goToPrev, goToNext]);

  // ====== Lightbox mouse drag (desktop) ======
  const handleLightboxMouseDown = useCallback((e: React.MouseEvent) => {
    lightboxMouseDown.current = true;
    lightboxMouseStartX.current = e.clientX;
    lightboxMouseDeltaX.current = 0;
  }, []);

  const handleLightboxMouseMove = useCallback((e: React.MouseEvent) => {
    if (!lightboxMouseDown.current) return;
    lightboxMouseDeltaX.current = e.clientX - lightboxMouseStartX.current;
  }, []);

  const handleLightboxMouseUp = useCallback(() => {
    if (!lightboxMouseDown.current) return;
    lightboxMouseDown.current = false;
    if (lightboxMouseDeltaX.current > 50) goToPrev();
    else if (lightboxMouseDeltaX.current < -50) goToNext();
    lightboxMouseDeltaX.current = 0;
  }, [goToPrev, goToNext]);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  const selectedTierPrice = useMemo(() => {
    const found = pack.prices.find((price) => price.tier === selectedTier);
    return found?.price ?? pack.prices[0]?.price ?? 0;
  }, [pack.prices, selectedTier]);

  const selectedExtraFeatures = useMemo(
    () => getTierExtraFeatures(selectedTier),
    [selectedTier]
  );

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
      coverUrl: allImages[0] || pack.coverUrl,
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
    <div className={`page-shell lg:pb-0 ${currentBeat ? "pb-32" : "pb-20"}`}>
      <nav aria-label="Breadcrumb" className="mb-5 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
        <span>/</span>
        <Link href="/beat-packs" className="hover:text-foreground transition-colors">Beat Packs</Link>
        <span>/</span>
        <span className="text-foreground font-medium truncate max-w-[200px]">{pack.title}</span>
      </nav>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1fr_340px]">
        {/* ====== Buy card – hidden on mobile, sticky sidebar on desktop ====== */}
        <div className="hidden lg:block lg:order-last lg:sticky lg:top-24 lg:self-start">
          <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {/* Price hero */}
              <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 px-5 py-6 text-center">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {pack.beatCount} beats · Starting at
                </p>
                <p className="mt-1 text-4xl font-extrabold tracking-tight text-primary">
                  ₹{Math.min(...pack.prices.map((p) => p.price)).toLocaleString("en-IN")}
                </p>
                {pack.beatCount > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    ₹{Math.round(Math.min(...pack.prices.map((p) => p.price)) / pack.beatCount).toLocaleString("en-IN")} per beat
                  </p>
                )}
              </div>

              <div className="space-y-2.5 px-5 pb-5">
                <p className="text-xs text-muted-foreground">{ownedLabel}</p>

                {hasPurchasedAll ? (
                  <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
                      <Check className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-sm font-semibold text-green-400">You own all beats</p>
                  </div>
                ) : (
                  <Dialog>
                    <DialogTrigger
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg transition-all cursor-pointer"
                    >
                      <Zap className="h-4 w-4" />
                      Buy Pack — ₹{Math.min(...pack.prices.map((p) => p.price)).toLocaleString("en-IN")}
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
                      <DialogHeader className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-5">
                        <DialogTitle className="text-xl">Choose Your Tier</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pack.title} · {pack.beatCount} beats
                        </p>
                      </DialogHeader>

                      <div className="space-y-5 px-6 py-5">
                        {/* Tier cards */}
                        <div className="grid gap-2.5">
                          {pack.prices.map((tierPrice) => {
                            const isSelected = selectedTier === tierPrice.tier;
                            const tierMeta = {
                              basic: {
                                icon: <Music className="h-5 w-5" />,
                                desc: "MP3 downloads · Limited commercial use",
                                iconBg: "bg-primary/10 text-primary",
                                border: isSelected ? "border-primary/60 bg-primary/5 ring-2 ring-primary/20 shadow-sm" : "border-border/40 hover:border-border/70 bg-card/60 hover:bg-card/80",
                                accent: "text-primary",
                                badge: null as { label: string; className: string } | null,
                              },
                              premium: {
                                icon: <Crown className="h-5 w-5" />,
                                desc: "MP3 + WAV · Full commercial use",
                                iconBg: "bg-amber-500/10 text-amber-500",
                                border: isSelected ? "border-amber-500/60 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-sm" : "border-border/40 hover:border-border/70 bg-card/60 hover:bg-card/80",
                                accent: "text-amber-500",
                                badge: { label: "Popular", className: "bg-amber-500 text-black" },
                              },
                              unlimited: {
                                icon: <Infinity className="h-5 w-5" />,
                                desc: "MP3 + WAV + Stems · Unlimited use",
                                iconBg: "bg-violet-500/10 text-violet-500",
                                border: isSelected ? "border-violet-500/60 bg-violet-500/5 ring-2 ring-violet-500/20 shadow-sm" : "border-border/40 hover:border-border/70 bg-card/60 hover:bg-card/80",
                                accent: "text-violet-500",
                                badge: { label: "Best Value", className: "bg-violet-500 text-white" },
                              },
                            }[tierPrice.tier] ?? {
                              icon: <Music className="h-5 w-5" />,
                              desc: "",
                              iconBg: "bg-primary/10 text-primary",
                              border: isSelected ? "border-primary/60 bg-primary/5 ring-2 ring-primary/20" : "border-border/40 bg-card/60",
                              accent: "text-primary",
                              badge: null,
                            };

                            return (
                              <button
                                key={tierPrice.tier}
                                type="button"
                                onClick={() => setSelectedTier(tierPrice.tier)}
                                className={`relative flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${tierMeta.border}`}
                              >
                                {tierMeta.badge && (
                                  <Badge className={`absolute -top-2.5 right-3 text-[10px] px-2 py-0.5 font-semibold shadow-sm ${tierMeta.badge.className}`}>
                                    {tierMeta.badge.label}
                                  </Badge>
                                )}

                                <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                                  isSelected ? "border-current bg-current" : "border-muted-foreground/30"
                                }`}>
                                  {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                                </div>

                                <div className={`shrink-0 rounded-lg p-2 ${tierMeta.iconBg}`}>
                                  {tierMeta.icon}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold capitalize">{tierPrice.tier}</p>
                                  <p className="text-xs text-muted-foreground">{tierMeta.desc}</p>
                                </div>

                                <div className="shrink-0 text-right">
                                  <p className={`text-lg font-extrabold ${tierMeta.accent}`}>
                                    ₹{tierPrice.price.toLocaleString("en-IN")}
                                  </p>
                                  {pack.beatCount > 0 && (
                                    <p className="text-[10px] text-muted-foreground">
                                      ₹{Math.round(tierPrice.price / pack.beatCount)}/beat
                                    </p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* What's included */}
                        <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5" />
                            What You Get
                          </p>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2.5">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                                <Check className="h-3 w-3 text-green-500" />
                              </div>
                              <span>Access to all {pack.beatCount} beats in this pack</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                                <Check className="h-3 w-3 text-green-500" />
                              </div>
                              <span>MP3 File</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                                <Check className="h-3 w-3 text-green-500" />
                              </div>
                              <span>WAV File</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selectedExtraFeatures.stems ? "bg-green-500/10" : "bg-red-500/10"}`}>
                                {selectedExtraFeatures.stems ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <X className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                              <span>Stems</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selectedExtraFeatures.contentId ? "bg-green-500/10" : "bg-red-500/10"}`}>
                                {selectedExtraFeatures.contentId ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <X className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                              <span>Content ID / Exclusive Rights</span>
                            </li>
                            <li className="flex items-center gap-2.5">
                              <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selectedExtraFeatures.streaming ? "bg-green-500/10" : "bg-red-500/10"}`}>
                                {selectedExtraFeatures.streaming ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <X className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                              <span>Spotify, Apple Music, YT Music</span>
                            </li>
                          </ul>
                        </div>

                        {/* Purchase CTAs */}
                        <div className="space-y-2 pt-1">
                          {isLoggedIn ? (
                            <>
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
                            </>
                          ) : (
                            <Button asChild className="w-full" size="lg">
                              <Link href="/login">Sign in to Purchase</Link>
                            </Button>
                          )}
                        </div>

                        {/* Trust signals */}
                        <div className="flex items-center justify-center gap-4 border-t border-border/30 pt-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Secure Payment
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Instant Download
                          </span>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                {inPackCart && !hasPurchasedAll && (
                  <Button asChild variant="outline" className="w-full rounded-xl" size="sm">
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

        {/* ====== Left column (content) ====== */}
        <div className="lg:order-first space-y-3 sm:space-y-5">
          <Card className="rounded-xl sm:rounded-2xl border-border/50 bg-card/80 shadow-sm overflow-hidden">
            {/* Image carousel */}
            {allImages.length > 0 ? (
              <div className="relative">
                <div
                  className="relative aspect-[2/1] sm:aspect-video w-full overflow-hidden border-b border-border/40 bg-muted/30 cursor-zoom-in"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onClick={() => setLightboxOpen(true)}
                >
                  <div
                    className="flex h-full transition-transform duration-300 ease-out"
                    style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
                  >
                    {allImages.map((url, i) => (
                      <div key={i} className="relative h-full w-full shrink-0 bg-black/5 dark:bg-white/5">
                        <Image
                          src={url}
                          alt={`${pack.title} — image ${i + 1}`}
                          fill
                          sizes="(max-width: 1024px) 100vw, 65vw"
                          className="object-contain"
                          priority={i === 0}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Prev / Next arrows (desktop hover) */}
                  {allImages.length > 1 && (
                    <>
                      {carouselIndex > 0 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); goToPrev(); }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 sm:h-9 sm:w-9"
                          aria-label="Previous image"
                        >
                          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      )}
                      {carouselIndex < allImages.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); goToNext(); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 sm:h-9 sm:w-9"
                          aria-label="Next image"
                        >
                          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Dot indicators + thumbnail strip */}
                {allImages.length > 1 && (
                  <div className="flex items-center justify-center gap-1.5 border-b border-border/40 px-3 py-2 sm:px-5">
                    {allImages.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCarouselIndex(i)}
                        className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md border-2 transition sm:h-14 sm:w-14 ${
                          i === carouselIndex
                            ? "border-primary ring-1 ring-primary/30"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <Image src={url} alt={`${pack.title} — image ${i + 1}`} fill sizes="56px" className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-[2/1] sm:aspect-video w-full items-center justify-center border-b border-border/40 bg-muted/30">
                <Layers className="h-10 w-10 text-muted-foreground/50" />
              </div>
            )}
            <div className="px-3 py-3 sm:px-5 sm:py-4">
              <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <h1 className="text-base font-semibold tracking-tight sm:text-2xl">{pack.title}</h1>
                  <Badge className="text-[11px]">{pack.beatCount} beats</Badge>
                </div>
                <ShareDialog title={pack.title} url={pageUrl} />
              </div>
              {pack.metadata && (
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-foreground/80">{pack.metadata}</p>
              )}
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
                  {pack.producerName &&
                    !pack.producerName.toLowerCase().includes("unknown") && (
                      <span className="text-sm font-medium">{pack.producerName}</span>
                    )}
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
                </div>
              </div>
            </div>
          </Card>

          <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
            <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden border-none bg-black/95">
              <DialogHeader className="sr-only">
                <DialogTitle>{pack.title} — image {carouselIndex + 1}</DialogTitle>
              </DialogHeader>
              <div
                className="relative flex h-[80vh] w-full cursor-grab select-none items-center justify-center active:cursor-grabbing"
                onTouchStart={handleLightboxTouchStart}
                onTouchMove={handleLightboxTouchMove}
                onTouchEnd={handleLightboxTouchEnd}
                onMouseDown={handleLightboxMouseDown}
                onMouseMove={handleLightboxMouseMove}
                onMouseUp={handleLightboxMouseUp}
                onMouseLeave={handleLightboxMouseUp}
              >
                {allImages.length > 0 && (
                  <Image
                    src={allImages[carouselIndex]}
                    alt={`${pack.title} — image ${carouselIndex + 1}`}
                    fill
                    sizes="95vw"
                    draggable={false}
                    className="pointer-events-none object-contain"
                  />
                )}
                {allImages.length > 1 && (
                  <>
                    {carouselIndex > 0 && (
                      <button
                        type="button"
                        onClick={goToPrev}
                        className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                        aria-label="Previous image"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                    )}
                    {carouselIndex < allImages.length - 1 && (
                      <button
                        type="button"
                        onClick={goToNext}
                        className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                        aria-label="Next image"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                      {carouselIndex + 1} / {allImages.length}
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Card className="rounded-xl sm:rounded-2xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader className="px-3 py-2.5 sm:px-6 sm:py-4">
              <CardTitle className="text-sm sm:text-lg">Tracks in This Pack</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 sm:space-y-2 px-3 pb-3 sm:px-6 sm:pb-6">
              {pack.tracks.map((track, index) => (
                <div
                  key={track.id}
                  className="rounded-lg border border-border/50 bg-background/50 p-2 sm:p-3"
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

        {/* Buy card is rendered above via order-first on mobile */}
      </div>

      {/* ====== Sticky mobile bottom bar (always visible on mobile, shifts up when audio player is open) ====== */}
      {!hasPurchasedAll && (
        <div className={`fixed inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden transition-[bottom] duration-200 ${currentBeat ? "bottom-[60px]" : "bottom-0"}`}>
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{pack.title}</p>
              <p className="text-xs text-muted-foreground">
                From <span className="font-bold text-primary">₹{Math.min(...pack.prices.map((p) => p.price)).toLocaleString("en-IN")}</span>
              </p>
            </div>
            <Dialog open={stickyDialogOpen} onOpenChange={setStickyDialogOpen}>
                 <DialogTrigger
  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
>
  <Zap className="h-4 w-4" />
  Buy Now
</DialogTrigger>
              <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
                <DialogHeader className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-5">
                  <DialogTitle className="text-xl">Choose Your Tier</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {pack.title} · {pack.beatCount} beats
                  </p>
                </DialogHeader>
                <div className="space-y-5 px-6 py-5">
                  <div className="grid gap-2.5">
                    {pack.prices.map((tierPrice) => {
                      const isSelected = selectedTier === tierPrice.tier;
                      const meta = {
                        basic: { icon: <Music className="h-5 w-5" />, desc: "MP3 · Limited commercial", iconBg: "bg-primary/10 text-primary", accent: "text-primary", border: isSelected ? "border-primary/60 bg-primary/5 ring-2 ring-primary/20" : "border-border/40 hover:border-border/70 bg-card/60" },
                        premium: { icon: <Crown className="h-5 w-5" />, desc: "MP3 + WAV · Full commercial", iconBg: "bg-amber-500/10 text-amber-500", accent: "text-amber-500", border: isSelected ? "border-amber-500/60 bg-amber-500/5 ring-2 ring-amber-500/20" : "border-border/40 hover:border-border/70 bg-card/60" },
                        unlimited: { icon: <Infinity className="h-5 w-5" />, desc: "All files · Unlimited use", iconBg: "bg-violet-500/10 text-violet-500", accent: "text-violet-500", border: isSelected ? "border-violet-500/60 bg-violet-500/5 ring-2 ring-violet-500/20" : "border-border/40 hover:border-border/70 bg-card/60" },
                      }[tierPrice.tier] ?? { icon: <Music className="h-5 w-5" />, desc: "", iconBg: "bg-primary/10 text-primary", accent: "text-primary", border: "border-border/40 bg-card/60" };

                      return (
                        <button
                          key={tierPrice.tier}
                          type="button"
                          onClick={() => setSelectedTier(tierPrice.tier)}
                          className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${meta.border}`}
                        >
                          <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? "border-current bg-current" : "border-muted-foreground/30"}`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className={`shrink-0 rounded-lg p-2 ${meta.iconBg}`}>{meta.icon}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold capitalize">{tierPrice.tier}</p>
                            <p className="text-xs text-muted-foreground">{meta.desc}</p>
                          </div>
                          <p className={`text-lg font-extrabold ${meta.accent}`}>₹{tierPrice.price.toLocaleString("en-IN")}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* What's included */}
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5" />
                      What You Get
                    </p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2.5">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                          <Check className="h-3 w-3 text-green-500" />
                        </div>
                        <span>Access to all {pack.beatCount} beats in this pack</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                          <Check className="h-3 w-3 text-green-500" />
                        </div>
                        <span>MP3 File</span>
                      </li>
                          <li className="flex items-center gap-2.5">
  <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selectedExtraFeatures.wav ? "bg-green-500/10" : "bg-red-500/10"}`}>
    {selectedExtraFeatures.wav ? (
      <Check className="h-3 w-3 text-green-500" />
    ) : (
      <X className="h-3 w-3 text-red-500" />
    )}
  </div>
  <span>WAV File</span>
</li>
                      <li className="flex items-center gap-2.5">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selectedExtraFeatures.stems ? "bg-green-500/10" : "bg-red-500/10"}`}>
                          {selectedExtraFeatures.stems ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <span>Stems</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selectedExtraFeatures.contentId ? "bg-green-500/10" : "bg-red-500/10"}`}>
                          {selectedExtraFeatures.contentId ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <span>Content ID / Exclusive Rights</span>
                      </li>
                      <li className="flex items-center gap-2.5">
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${selectedExtraFeatures.streaming ? "bg-green-500/10" : "bg-red-500/10"}`}>
                          {selectedExtraFeatures.streaming ? (
                            <Check className="h-3 w-3 text-green-500" />
                          ) : (
                            <X className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <span>Spotify, Apple Music, YT Music</span>
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    {isLoggedIn ? (
                      <>
                        <PackRazorpayButton packId={pack.id} tier={selectedTier} amount={selectedTierPrice} packTitle={pack.title} />
                        {inPackCart ? (
                          <Button asChild variant="outline" className="w-full">
                            <Link href="/cart"><ShoppingCart className="mr-2 h-4 w-4" />View Cart</Link>
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full" onClick={handleAddPackToCart} disabled={addingToCart}>
                            <ShoppingCart className="mr-2 h-4 w-4" />{addingToCart ? "Adding..." : "Add Pack to Cart"}
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button asChild className="w-full" size="lg"><Link href="/login">Sign in to Purchase</Link></Button>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}
