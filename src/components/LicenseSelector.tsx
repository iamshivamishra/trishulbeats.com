"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, X as XIcon, Music, FileAudio, FileArchive,
  Briefcase, Radio, Infinity, Crown, ShoppingCart,
  Shield, Sparkles, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { tierAccent } from "@/lib/license-ui";
import { useCart } from "@/components/CartProvider";
import { useAudioActions } from "@/components/AudioPlayerContext";
import dynamic from "next/dynamic";
import type { ILicense } from "@/types";

const RazorpayButton = dynamic(() => import("@/components/RazorpayButton"), {
  ssr: false,
  loading: () => (
    <div className="h-11 w-full animate-pulse rounded-md bg-muted" />
  ),
});

interface Props {
  licenses: ILicense[];
  beatId: string;
  beatTitle: string;
  isLoggedIn: boolean;
  hasPurchased: boolean;
}

function streamLimitLabel(limit: number): string {
  if (limit <= 0 || limit === -1) return "Unlimited";
  if (limit >= 1000) return `${(limit / 1000).toFixed(0)}K`;
  return limit.toString();
}

function tierIcon(type: string) {
  switch (type) {
    case "basic": return <Music className="h-5 w-5" />;
    case "premium": return <Crown className="h-5 w-5" />;
    case "unlimited": return <Infinity className="h-5 w-5" />;
    default: return <Music className="h-5 w-5" />;
  }
}

function tierBadge(type: string): { label: string; className: string } | null {
  switch (type) {
    case "premium": return { label: "Most Popular", className: "bg-amber-500 text-black" };
    case "unlimited": return { label: "Best Value", className: "bg-violet-500 text-white" };
    default: return null;
  }
}

function tierBorder(type: string, selected: boolean) {
  if (!selected) return "border-border/40 hover:border-border/70 bg-card/60 hover:bg-card/80";
  switch (type) {
    case "basic": return "border-primary/60 bg-primary/5 ring-2 ring-primary/20 shadow-sm";
    case "premium": return "border-amber-500/60 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-sm";
    case "unlimited": return "border-violet-500/60 bg-violet-500/5 ring-2 ring-violet-500/20 shadow-sm";
    default: return "border-primary/60 bg-primary/5 ring-2 ring-primary/20";
  }
}

function tierIconBg(type: string) {
  switch (type) {
    case "basic": return "bg-primary/10 text-primary";
    case "premium": return "bg-amber-500/10 text-amber-500";
    case "unlimited": return "bg-violet-500/10 text-violet-500";
    default: return "bg-primary/10 text-primary";
  }
}

interface FeatureRow {
  label: string;
  icon: React.ReactNode;
  check: (l: ILicense) => boolean | string;
}

const FEATURES: FeatureRow[] = [
  { label: "MP3 Download", icon: <Music className="h-4 w-4" />, check: () => true },
  { label: "WAV Download", icon: <FileAudio className="h-4 w-4" />, check: (l) => l.includesWav },
  { label: "Track Stems", icon: <FileArchive className="h-4 w-4" />, check: (l) => l.includesStems },
  { label: "Commercial Use", icon: <Briefcase className="h-4 w-4" />, check: (l) => l.commercialUse },
  { label: "Streaming Limit", icon: <Radio className="h-4 w-4" />, check: (l) => streamLimitLabel(l.streamLimit) },
];

export default function LicenseSelector({
  licenses,
  beatId,
  beatTitle,
  isLoggedIn,
  hasPurchased,
}: Props) {
  const { addItem, isInCart } = useCart();
  const { currentBeat } = useAudioActions();
  const isPlayerVisible = !!currentBeat;
  const [selectedId, setSelectedId] = useState<string>(
    licenses.length > 0 ? licenses[0]._id.toString() : ""
  );
  const [adding, setAdding] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stickyDialogOpen, setStickyDialogOpen] = useState(false);

  const inCart = isInCart(beatId);

  if (hasPurchased) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
            <Check className="h-6 w-6 text-green-400" />
          </div>
          <p className="font-semibold text-green-400">You own this beat</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Download the full untagged track above.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (licenses.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-5 text-center text-muted-foreground">
          No licenses available for this beat.
        </CardContent>
      </Card>
    );
  }

  const selected = licenses.find((l) => l._id.toString() === selectedId) || licenses[0];
  const cheapest = licenses.reduce((min, l) => (l.isActive && l.price < min.price ? l : min), licenses[0]);

  const handleAddToCart = async () => {
    setAdding(true);
    await addItem(beatId, selected._id.toString());
    setAdding(false);
  };

  return (
    <div className="space-y-3">
      <Card className="hidden rounded-2xl border-border/50 bg-card/80 shadow-sm overflow-hidden lg:block">
        <CardContent className="p-0">
          {/* Price hero */}
          <div className="bg-gradient-to-br from-primary/5 via-transparent to-primary/5 px-5 py-6 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Starting at</p>
            <p className="mt-1 text-4xl font-extrabold tracking-tight text-primary">
              ₹{cheapest.price.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {licenses.length} license {licenses.length === 1 ? "tier" : "tiers"} available
            </p>
          </div>

          <div className="space-y-2.5 px-5 pb-5">
            {/* Buy trigger */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 hover:shadow-lg transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                Buy Now — ₹{cheapest.price.toLocaleString("en-IN")}
              </DialogTrigger>

              <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
                <DialogHeader className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-5">
                  <DialogTitle className="text-xl">Choose Your License</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{beatTitle}</p>
                </DialogHeader>

                <div className="space-y-5 px-6 py-5">
                  {/* Tier cards */}
                  <div className="grid gap-2.5">
                    {licenses.map((lic) => {
                      const id = lic._id.toString();
                      const isSelected = id === selectedId;
                      const badge = tierBadge(lic.type);

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedId(id)}
                          className={cn(
                            "relative flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-200",
                            tierBorder(lic.type, isSelected)
                          )}
                        >
                          {badge && (
                            <Badge className={cn("absolute -top-2.5 right-3 text-[10px] px-2 py-0.5 font-semibold shadow-sm", badge.className)}>
                              {badge.label}
                            </Badge>
                          )}

                          {/* Selection indicator */}
                          <div className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            isSelected ? "border-current bg-current" : "border-muted-foreground/30"
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>

                          <div className={cn("shrink-0 rounded-lg p-2", tierIconBg(lic.type))}>
                            {tierIcon(lic.type)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold capitalize">{lic.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{lic.terms}</p>
                          </div>

                          <div className="shrink-0 text-right">
                            <p className={cn("text-lg font-extrabold", tierAccent(lic.type))}>
                              ₹{lic.price.toLocaleString("en-IN")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Feature comparison */}
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                    <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                      <Shield className="h-3.5 w-3.5" />
                      What&apos;s Included
                    </p>
                    <div className="space-y-2.5">
                      {FEATURES.map((feature) => {
                        const value = feature.check(selected);
                        const isString = typeof value === "string";
                        const isIncluded = isString ? true : value;

                        return (
                          <div key={feature.label} className="flex items-center gap-3">
                            <span className="shrink-0 text-muted-foreground/60">{feature.icon}</span>
                            <span className={cn("flex-1 text-sm", isIncluded || isString ? "text-foreground" : "text-muted-foreground/50")}>
                              {feature.label}
                            </span>
                            {isString ? (
                              <Badge variant="outline" className="text-[10px] font-semibold">{value}</Badge>
                            ) : isIncluded ? (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500/10">
                                <Check className="h-3 w-3 text-green-500" />
                              </div>
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                                <XIcon className="h-3 w-3 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="space-y-2 pt-1">
                    {isLoggedIn ? (
                      <RazorpayButton
                        beatId={beatId}
                        licenseId={selected._id.toString()}
                        price={selected.price}
                        beatTitle={beatTitle}
                        licenseType={selected.type}
                      />
                    ) : (
                      <Button asChild className="w-full" size="lg">
                        <Link href="/login">Sign in to Purchase</Link>
                      </Button>
                    )}

                    {inCart ? (
                      <Button asChild variant="outline" className="w-full" size="lg">
                        <Link href="/cart">
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          View Cart
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full"
                        size="lg"
                        onClick={handleAddToCart}
                        disabled={adding}
                      >
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        {adding ? "Adding..." : "Add to Cart"}
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

            {/* Cart shortcut */}
            {inCart && (
              <Button asChild variant="outline" className="w-full rounded-xl" size="sm">
                <Link href="/cart">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  View Cart
                </Link>
              </Button>
            )}

            {/* Trust bar on outer card */}
            <p className="text-center text-[11px] text-muted-foreground/60 pt-1">
              <Shield className="mr-1 inline h-3 w-3" />
              Secure checkout · Instant delivery
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ====== Sticky mobile bottom bar (always visible on mobile, shifts up when audio player is open) ====== */}
      {!hasPurchased && licenses.length > 0 && (
        <div className={cn(
          "fixed inset-x-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur-md px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)] lg:hidden transition-[bottom] duration-200",
          isPlayerVisible ? "bottom-[60px]" : "bottom-0"
        )}>
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{beatTitle}</p>
              <p className="text-xs text-muted-foreground">
                From <span className="font-bold text-primary">₹{cheapest.price.toLocaleString("en-IN")}</span>
              </p>
            </div>
            <Dialog open={stickyDialogOpen} onOpenChange={setStickyDialogOpen}>
              <DialogTrigger
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all cursor-pointer"
              >
                <Zap className="h-4 w-4" />
                Buy
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[85vh] overflow-y-auto">
                <DialogHeader className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 px-6 py-5">
                  <DialogTitle className="text-xl">Choose Your License</DialogTitle>
                  <p className="text-sm text-muted-foreground mt-1">{beatTitle}</p>
                </DialogHeader>
                <div className="space-y-4 px-6 py-5">
                  <div className="grid gap-2">
                    {licenses.map((lic) => {
                      const id = lic._id.toString();
                      const isSelected = id === selectedId;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setSelectedId(id)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                            tierBorder(lic.type, isSelected)
                          )}
                        >
                          <div className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                            isSelected ? "border-current bg-current" : "border-muted-foreground/30"
                          )}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className={cn("shrink-0 rounded-lg p-2", tierIconBg(lic.type))}>{tierIcon(lic.type)}</div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold capitalize">{lic.name}</p>
                            <p className="text-xs text-muted-foreground line-clamp-1">{lic.terms}</p>
                          </div>
                          <p className={cn("text-lg font-extrabold", tierAccent(lic.type))}>₹{lic.price.toLocaleString("en-IN")}</p>
                        </button>
                      );
                    })}
                  </div>
                  <div className="space-y-2">
                    {isLoggedIn ? (
                      <RazorpayButton beatId={beatId} licenseId={selected._id.toString()} price={selected.price} beatTitle={beatTitle} licenseType={selected.type} />
                    ) : (
                      <Button asChild className="w-full" size="lg"><Link href="/login">Sign in to Purchase</Link></Button>
                    )}
                    {inCart ? (
                      <Button asChild variant="outline" className="w-full"><Link href="/cart"><ShoppingCart className="mr-2 h-4 w-4" />View Cart</Link></Button>
                    ) : (
                      <Button variant="outline" className="w-full" onClick={handleAddToCart} disabled={adding}>
                        <ShoppingCart className="mr-2 h-4 w-4" />{adding ? "Adding..." : "Add to Cart"}
                      </Button>
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
