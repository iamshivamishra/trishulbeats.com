"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpCircle, Calendar, ChevronDown, ChevronUp, Download, Music,
  Package, ShoppingBag,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DownloadPanel from "@/components/DownloadPanel";
import PackUpgradeRazorpayButton from "@/features/payments/PackUpgradeRazorpayButton";

interface BeatHistoryItem {
  type: "beat";
  purchasedAt: string;
  beatId: string;
  beatTitle: string;
  coverUrl?: string;
  licenseType: string;
  amount: number;
  purchaseId: string;
}

interface UpgradeOption {
  tier: "premium" | "unlimited";
  upgradePrice: number;
  fullPrice: number;
  unlocks: string;
}

interface PackHistoryItem {
  type: "pack";
  purchasedAt: string;
  packId: string;
  title: string;
  tier: string;
  beatCount: number;
  totalAmount: number;
  imageUrl?: string;
  tracks: { beatId: string; title: string; coverUrl?: string }[];
  upgradeOptions?: UpgradeOption[];
}

export type HistoryItem = BeatHistoryItem | PackHistoryItem;

interface Props {
  items: HistoryItem[];
  totalCount: number;
}

function PackRow({ item }: { item: PackHistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-primary/10"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-primary/10">
            {item.imageUrl ? (
              <Image
                src={item.imageUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <Badge className="text-[10px] px-1.5 py-0 shrink-0">Pack</Badge>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs capitalize">
                {item.tier}
              </Badge>
              <span>{item.beatCount} beats</span>
              <span className="hidden sm:flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(item.purchasedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="text-sm font-bold">₹{item.totalAmount}</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-primary/10 bg-background/50 px-3 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Downloads — {item.tracks.length} tracks
            </p>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs">
              <Link href={`/profile/packs/${item.packId}`}>View Pack</Link>
            </Button>
          </div>

          <div className="space-y-4">
            {item.tracks.map((track) => (
              <div key={track.beatId} className="rounded-lg border border-border/40 bg-card/60 p-3">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded bg-primary/10">
                    {track.coverUrl ? (
                      <Image
                        src={track.coverUrl}
                        alt={track.title}
                        fill
                        className="object-cover"
                        sizes="32px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Music className="h-4 w-4 text-primary/50" />
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{track.title}</p>
                </div>
                <DownloadPanel beatId={track.beatId} />
              </div>
            ))}
          </div>

          {item.upgradeOptions && item.upgradeOptions.length > 0 && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <ArrowUpCircle className="h-3.5 w-3.5" />
                Upgrade Your License
              </p>
              <div className="space-y-2">
                {item.upgradeOptions.map((opt) => (
                  <div key={opt.tier} className="rounded-lg border border-border/40 bg-card/60 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold capitalize">{opt.tier}</p>
                        <p className="text-xs text-muted-foreground">{opt.unlocks}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground line-through">₹{opt.fullPrice.toLocaleString("en-IN")}</p>
                        <p className="text-sm font-bold text-amber-500">₹{opt.upgradePrice.toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <PackUpgradeRazorpayButton
                      packId={item.packId}
                      targetTier={opt.tier}
                      upgradeAmount={opt.upgradePrice}
                      packTitle={item.title}
                      currentTier={item.tier}
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

function BeatRow({ item }: { item: BeatHistoryItem }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-border/30 bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-muted/30"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-primary/10">
            {item.coverUrl ? (
              <Image
                src={item.coverUrl}
                alt={item.beatTitle}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Music className="h-5 w-5 text-primary" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{item.beatTitle}</p>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs capitalize">
                {item.licenseType}
              </Badge>
              <span className="hidden sm:flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(item.purchasedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <p className="text-sm font-bold">₹{item.amount}</p>
          <div className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border/30 bg-background/50 px-3 py-3">
          <DownloadPanel beatId={item.beatId} />
        </div>
      )}
    </div>
  );
}

export default function PurchaseHistoryComponent({ items, totalCount }: Props) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Purchase History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <div className="space-y-3">
            {items.map((item) =>
              item.type === "pack" ? (
                <PackRow key={`pack-${item.packId}`} item={item} />
              ) : (
                <BeatRow key={`beat-${item.purchaseId}`} item={item} />
              )
            )}
            {totalCount > 20 && (
              <p className="pt-3 text-center text-xs text-muted-foreground">
                Showing 20 of {totalCount} purchases
              </p>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <ShoppingBag className="mx-auto mb-2 h-8 w-8" />
            <p>No purchases yet.</p>
            <Button asChild variant="link" className="mt-2">
              <Link href="/beat-packs">Browse Beat Packs</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
