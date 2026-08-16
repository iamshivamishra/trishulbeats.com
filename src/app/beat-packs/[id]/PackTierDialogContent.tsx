"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Crown,
  Infinity,
  Loader2,
  Music,
  Shield,
  ShoppingCart,
  Sparkles,
  Ticket,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PackRazorpayButton from "@/features/payments/PackRazorpayButton";
import type { BeatPackTierPrice } from "@/features/beats/beat-pack-ui";
import type { LicenseType } from "@/types";

interface TierExtraFeatures {
  contentId: boolean;
  streaming: boolean;
  stems: boolean;
  wav: boolean;
}

interface PackTierDialogContentProps {
  prices: BeatPackTierPrice[];
  beatCount: number;
  packId: string;
  packTitle: string;
  selectedTier: LicenseType;
  onSelectTier: (tier: LicenseType) => void;
  selectedTierPrice: number;
  selectedExtraFeatures: TierExtraFeatures;
  isLoggedIn: boolean;
  inPackCart: boolean;
  addingToCart: boolean;
  onAddToCart: () => void;
}

const TIER_META = {
  basic: {
    icon: <Music className="h-5 w-5" />,
    desc: "MP3 downloads · Limited commercial use",
    iconBg: "bg-primary/10 text-primary",
    accent: "text-primary",
    badge: null as { label: string; className: string } | null,
    selectedBorder: "border-primary/60 bg-primary/5 ring-2 ring-primary/20 shadow-sm",
    defaultBorder: "border-border/40 hover:border-border/70 bg-card/60 hover:bg-card/80",
  },
  premium: {
    icon: <Crown className="h-5 w-5" />,
    desc: "MP3 + WAV · Full commercial use",
    iconBg: "bg-amber-500/10 text-amber-500",
    accent: "text-amber-500",
    badge: { label: "Popular", className: "bg-amber-500 text-black" },
    selectedBorder: "border-amber-500/60 bg-amber-500/5 ring-2 ring-amber-500/20 shadow-sm",
    defaultBorder: "border-border/40 hover:border-border/70 bg-card/60 hover:bg-card/80",
  },
  unlimited: {
    icon: <Infinity className="h-5 w-5" />,
    desc: "MP3 + WAV + Stems · Unlimited use",
    iconBg: "bg-violet-500/10 text-violet-500",
    accent: "text-violet-500",
    badge: { label: "Best Value", className: "bg-violet-500 text-white" },
    selectedBorder: "border-violet-500/60 bg-violet-500/5 ring-2 ring-violet-500/20 shadow-sm",
    defaultBorder: "border-border/40 hover:border-border/70 bg-card/60 hover:bg-card/80",
  },
} as const;

const FALLBACK_META = {
  icon: <Music className="h-5 w-5" />,
  desc: "",
  iconBg: "bg-primary/10 text-primary",
  accent: "text-primary",
  badge: null,
  selectedBorder: "border-primary/60 bg-primary/5 ring-2 ring-primary/20",
  defaultBorder: "border-border/40 bg-card/60",
};

function FeatureRow({
  included,
  label,
}: {
  included: boolean;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2.5">
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${included ? "bg-green-500/10" : "bg-red-500/10"}`}
      >
        {included ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <X className="h-3 w-3 text-red-500" />
        )}
      </div>
      <span>{label}</span>
    </li>
  );
}

export default function PackTierDialogContent({
  prices,
  beatCount,
  packId,
  packTitle,
  selectedTier,
  onSelectTier,
  selectedTierPrice,
  selectedExtraFeatures,
  isLoggedIn,
  inPackCart,
  addingToCart,
  onAddToCart,
}: PackTierDialogContentProps) {
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponApplied, setCouponApplied] = useState<{
    code: string;
    totalDiscount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const handleApplyCoupon = async () => {
    const code = couponCode.trim();
    if (!code) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          packIds: [packId],
          tiers: { [packId]: selectedTier },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCouponError(data.error || "Invalid coupon");
        setCouponApplied(null);
        return;
      }
      setCouponApplied({ code: data.code, totalDiscount: data.totalDiscount });
      setCouponError(null);
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError(null);
  };

  const discountAmount = couponApplied?.totalDiscount ?? 0;
  const finalPrice = Math.max(1, selectedTierPrice - discountAmount);

  return (
    <div className="space-y-5 px-6 py-5">
      <div className="grid gap-2.5">
        {prices.map((tierPrice) => {
          const isSelected = selectedTier === tierPrice.tier;
          const meta =
            TIER_META[tierPrice.tier as keyof typeof TIER_META] ?? FALLBACK_META;

          return (
            <button
              key={tierPrice.tier}
              type="button"
              onClick={() => onSelectTier(tierPrice.tier)}
              className={`relative flex items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${isSelected ? meta.selectedBorder : meta.defaultBorder}`}
            >
              {meta.badge && (
                <span
                  className={`absolute -top-2.5 right-3 inline-flex items-center rounded-full text-[10px] px-2 py-0.5 font-semibold shadow-sm ${meta.badge.className}`}
                >
                  {meta.badge.label}
                </span>
              )}

              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected
                    ? "border-current bg-current"
                    : "border-muted-foreground/30"
                }`}
              >
                {isSelected && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </div>

              <div className={`shrink-0 rounded-lg p-2 ${meta.iconBg}`}>
                {meta.icon}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold capitalize">{tierPrice.tier}</p>
                <p className="text-xs text-muted-foreground">{meta.desc}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className={`text-lg font-extrabold ${meta.accent}`}>
                  ₹{tierPrice.price.toLocaleString("en-IN")}
                </p>
                {beatCount > 0 && (
                  <p className="text-[10px] text-muted-foreground">
                    ₹{Math.round(tierPrice.price / beatCount)}/beat
                  </p>
                )}
              </div>
            </button>
          );
        })}
      </div>

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
            <span>Access to all {beatCount} beats in this pack</span>
          </li>
          <li className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-3 w-3 text-green-500" />
            </div>
            <span>MP3 File</span>
          </li>
          <FeatureRow included={selectedExtraFeatures.wav} label="WAV File" />
          <FeatureRow included={selectedExtraFeatures.stems} label="Stems" />
          <FeatureRow
            included={selectedExtraFeatures.contentId}
            label="Content ID / Exclusive Rights"
          />
          <FeatureRow
            included={selectedExtraFeatures.streaming}
            label="Spotify, Apple Music, YT Music"
          />
        </ul>
      </div>

      {/* Coupon Input */}
      {isLoggedIn && (
        <div className="space-y-2">
          {couponApplied ? (
            <div className="flex items-center justify-between rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2 text-sm">
              <div className="flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5 text-green-500" />
                <span className="font-mono font-semibold">{couponApplied.code}</span>
                <span className="text-green-600">-₹{couponApplied.totalDiscount}</span>
              </div>
              <button
                onClick={handleRemoveCoupon}
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-1.5">
                <div className="relative flex-1">
                  <Ticket className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Coupon code"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      setCouponError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    className="h-9 w-full rounded-md border border-border bg-background pl-8 pr-3 font-mono text-sm uppercase tracking-wider placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 px-3"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {couponError && (
                <p className="mt-1 text-xs text-destructive">{couponError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {couponApplied && (
        <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            <span className="line-through">₹{selectedTierPrice.toLocaleString("en-IN")}</span>
          </span>
          <span className="font-bold text-primary">₹{finalPrice.toLocaleString("en-IN")}</span>
        </div>
      )}

      <div className="space-y-2 pt-1">
        {isLoggedIn ? (
          <>
            <PackRazorpayButton
              packId={packId}
              tier={selectedTier}
              amount={finalPrice}
              packTitle={packTitle}
              couponCode={couponApplied?.code}
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
                onClick={onAddToCart}
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

      <div className="flex items-center justify-center gap-4 border-t border-border/30 pt-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Shield className="h-3 w-3" /> Secure Payment
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-3 w-3" /> Instant Download
        </span>
      </div>
    </div>
  );
}
