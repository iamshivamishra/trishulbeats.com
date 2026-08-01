"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  Music,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DownloadPanel from "@/components/DownloadPanel";
import PackUpgradeRazorpayButton from "@/components/PackUpgradeRazorpayButton";

interface UpgradeOption {
  tier: "premium" | "unlimited";
  upgradePrice: number;
  fullPrice: number;
  unlocks: string;
}

export interface PackItem {
  packId: string;
  title: string;
  imageUrl?: string;
  tier: string;
  beatCount: number;
  totalAmount: number;
  purchasedAt: string;
  tracks: { beatId: string; title: string; coverUrl?: string }[];
  upgradeOptions: UpgradeOption[];
}

interface Props {
  packs: PackItem[];
}

function PackCard({ pack }: { pack: PackItem }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = new Date(pack.purchasedAt).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-primary/10">
            {pack.imageUrl ? (
              <Image
                src={pack.imageUrl}
                alt={pack.title}
                fill
                className="object-cover"
                sizes="56px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-semibold truncate">{pack.title}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {pack.tier}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {pack.beatCount} beats
              </span>
              <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {dateStr}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold">
              ₹{pack.totalAmount.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-primary/10 bg-background/50 p-4 space-y-4">
          {/* Quick actions */}
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {pack.tracks.length} tracks — download files
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 text-xs"
            >
              <Link href={`/profile/packs/${pack.packId}`}>
                <ExternalLink className="mr-1.5 h-3 w-3" />
                Full Details
              </Link>
            </Button>
          </div>

          {/* Tracks with download panels */}
          <div className="space-y-3">
            {pack.tracks.map((track) => (
              <div
                key={track.beatId}
                className="rounded-lg border border-border/40 bg-card/60 p-3"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded bg-primary/10">
                    {track.coverUrl ? (
                      <Image
                        src={track.coverUrl}
                        alt={track.title}
                        fill
                        className="object-cover"
                        sizes="36px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-4 w-4 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <Link
                    href={`/beats/${track.beatId}`}
                    className="text-sm font-medium truncate hover:underline"
                  >
                    {track.title}
                  </Link>
                </div>
                <DownloadPanel beatId={track.beatId} />
              </div>
            ))}
          </div>

          {/* Upgrade options */}
          {pack.upgradeOptions.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Upgrade Your License
              </p>
              <div className="space-y-2">
                {pack.upgradeOptions.map((opt) => (
                  <div
                    key={opt.tier}
                    className="rounded-lg border border-border/40 bg-card/60 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold capitalize">
                          {opt.tier}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {opt.unlocks}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground line-through">
                          ₹{opt.fullPrice.toLocaleString("en-IN")}
                        </p>
                        <p className="text-sm font-bold text-amber-500">
                          ₹{opt.upgradePrice.toLocaleString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <PackUpgradeRazorpayButton
                      packId={pack.packId}
                      targetTier={opt.tier}
                      upgradeAmount={opt.upgradePrice}
                      packTitle={pack.title}
                      currentTier={pack.tier}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function MyPacksClient({ packs }: Props) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          My Packs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {packs.length > 0 ? (
          <div className="space-y-4">
            {packs.map((pack) => (
              <PackCard key={pack.packId} pack={pack} />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <ShoppingBag className="mx-auto mb-3 h-10 w-10" />
            <p className="font-medium">No beat packs purchased yet</p>
            <p className="mt-1 text-sm">
              Browse and purchase beat packs to see them here.
            </p>
            <Button asChild variant="link" className="mt-3">
              <Link href="/beat-packs">Browse Beat Packs</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
