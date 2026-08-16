"use client";

import { ArrowUpCircle, Check, Download, FileText, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import PackUpgradeRazorpayButton from "@/features/payments/PackUpgradeRazorpayButton";
import type { PurchasedTierInfo } from "@/features/beats/beat-pack-ui";

interface UpgradeOption {
  tier: "premium" | "unlimited";
  fullPrice: number;
  upgradePrice: number;
  features: { wav: boolean; stems: boolean; contentId: boolean };
}

interface PackDownloadSectionProps {
  packId: string;
  packTitle: string;
  purchasedTier: PurchasedTierInfo;
  upgradeOptions: UpgradeOption[];
}

export default function PackDownloadSection({
  packId,
  packTitle,
  purchasedTier,
  upgradeOptions,
}: PackDownloadSectionProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-500/10">
          <Check className="h-5 w-5 text-green-500" />
        </div>
        <p className="text-sm font-semibold text-green-400">
          You own all beats
        </p>
        <Badge variant="outline" className="mt-2 capitalize">
          {purchasedTier.tier} License
        </Badge>
      </div>

      <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
        <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
          <Download className="h-3.5 w-3.5" />
          Your Files
        </p>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center gap-2.5">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-500/10">
              <Check className="h-3 w-3 text-green-500" />
            </div>
            <span>MP3 Files</span>
          </li>
          <li className="flex items-center gap-2.5">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${purchasedTier.includesWav ? "bg-green-500/10" : "bg-red-500/10"}`}
            >
              {purchasedTier.includesWav ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <X className="h-3 w-3 text-red-500" />
              )}
            </div>
            <span>WAV Files</span>
          </li>
          <li className="flex items-center gap-2.5">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${purchasedTier.includesStems ? "bg-green-500/10" : "bg-red-500/10"}`}
            >
              {purchasedTier.includesStems ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <X className="h-3 w-3 text-red-500" />
              )}
            </div>
            <span>Stem Files</span>
          </li>
        </ul>
      </div>

      {upgradeOptions.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <ArrowUpCircle className="h-3.5 w-3.5" />
            Upgrade Your License
          </p>
          <div className="space-y-2">
            {upgradeOptions.map((opt) => (
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
                      {opt.features.wav && !purchasedTier.includesWav
                        ? "+WAV "
                        : ""}
                      {opt.features.stems && !purchasedTier.includesStems
                        ? "+Stems "
                        : ""}
                      {opt.features.contentId ? "+Content ID" : ""}
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
                  packId={packId}
                  targetTier={opt.tier}
                  upgradeAmount={opt.upgradePrice}
                  packTitle={packTitle}
                  currentTier={purchasedTier.tier}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <a
        href={`/api/beat-packs/${packId}/license`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
      >
        <FileText className="h-4 w-4 text-muted-foreground" />
        Download License Agreement
      </a>

      <p className="text-xs text-center text-muted-foreground">
        Click any track above to download your files
      </p>
    </div>
  );
}
