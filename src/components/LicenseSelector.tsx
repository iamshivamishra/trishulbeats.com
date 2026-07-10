"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check, X as XIcon, Music, FileAudio, FileArchive,
  Briefcase, Radio, Infinity, Crown, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { tierAccent } from "@/lib/license-ui";
import { useCart } from "@/components/CartProvider";
import RazorpayButton from "@/components/RazorpayButton";
import type { ILicense } from "@/types";

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

function tierColor(type: string, selected: boolean) {
  if (!selected) return "border-border/50 bg-card/80";
  switch (type) {
    case "basic": return "border-primary/50 bg-primary/5 ring-1 ring-primary/20";
    case "premium": return "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20";
    case "unlimited": return "border-violet-500/50 bg-violet-500/5 ring-1 ring-violet-500/20";
    default: return "border-primary/50 bg-primary/5";
  }
}

interface FeatureRow {
  label: string;
  icon: React.ReactNode;
  check: (l: ILicense) => boolean | string;
}

const FEATURES: FeatureRow[] = [
  { label: "MP3 File", icon: <Music className="h-4 w-4" />, check: () => true },
  { label: "WAV File", icon: <FileAudio className="h-4 w-4" />, check: (l) => l.includesWav },
  { label: "Stems", icon: <FileArchive className="h-4 w-4" />, check: (l) => l.includesStems },
  { label: "Commercial Use", icon: <Briefcase className="h-4 w-4" />, check: (l) => l.commercialUse },
  { label: "Stream Limit", icon: <Radio className="h-4 w-4" />, check: (l) => streamLimitLabel(l.streamLimit) },
];

export default function LicenseSelector({
  licenses,
  beatId,
  beatTitle,
  isLoggedIn,
  hasPurchased,
}: Props) {
  const { addItem, isInCart } = useCart();
  const [selectedId, setSelectedId] = useState<string>(
    licenses.length > 0 ? licenses[0]._id.toString() : ""
  );
  const [adding, setAdding] = useState(false);

  const inCart = isInCart(beatId);

  if (hasPurchased) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="p-5 text-center">
          <Check className="mx-auto mb-2 h-8 w-8 text-green-400" />
          <p className="font-medium text-green-400">You own a license for this beat</p>
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

  const handleAddToCart = async () => {
    setAdding(true);
    await addItem(beatId, selected._id.toString());
    setAdding(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">License This Beat</h2>

      {/* Tier selector cards */}
      <div className="grid gap-3">
        {licenses.map((lic) => {
          const id = lic._id.toString();
          const isSelected = id === selectedId;

          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedId(id)}
              className={cn(
                "relative flex items-center gap-4 rounded-xl border p-4 text-left transition-all",
                tierColor(lic.type, isSelected)
              )}
            >
              {lic.type === "premium" && (
                <Badge className="absolute -top-2.5 right-3 bg-amber-500 text-black text-xs">
                  Popular
                </Badge>
              )}

              <div className={cn("shrink-0 rounded-lg bg-background/50 p-2", tierAccent(lic.type))}>
                {tierIcon(lic.type)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold">{lic.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{lic.terms}</p>
              </div>

              <div className="shrink-0 text-right">
                <p className={cn("text-lg font-bold", tierAccent(lic.type))}>
                  ₹{lic.price.toLocaleString()}
                </p>
              </div>

              {isSelected && (
                <div className={cn("absolute left-0 top-0 h-full w-1 rounded-l-xl", {
                  "bg-primary": lic.type === "basic",
                  "bg-amber-500": lic.type === "premium",
                  "bg-violet-500": lic.type === "unlimited",
                })} />
              )}
            </button>
          );
        })}
      </div>

      {/* Feature comparison */}
      <Card className="border-border/50 bg-card/80">
        <CardContent className="p-4">
          <p className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            What&apos;s included
          </p>
          <div className="space-y-2.5">
            {FEATURES.map((feature) => {
              const value = feature.check(selected);
              const isString = typeof value === "string";
              const isIncluded = isString ? true : value;

              return (
                <div key={feature.label} className="flex items-center gap-3">
                  <span className="shrink-0 text-muted-foreground">{feature.icon}</span>
                  <span className="flex-1 text-sm">{feature.label}</span>
                  {isString ? (
                    <span className="text-sm font-medium">{value}</span>
                  ) : isIncluded ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <XIcon className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CTAs */}
      <div className="space-y-2">
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
    </div>
  );
}
