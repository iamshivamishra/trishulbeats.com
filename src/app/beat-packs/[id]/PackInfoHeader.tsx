"use client";

import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import ShareDialog from "@/components/ShareDialog";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

interface PackInfoHeaderProps {
  pack: Pick<
    BeatPackUi,
    | "title"
    | "beatCount"
    | "producerName"
    | "producerUsername"
    | "producerAvatarUrl"
    | "tags"
  >;
  pageUrl: string;
}

export default function PackInfoHeader({ pack, pageUrl }: PackInfoHeaderProps) {
  return (
    <div className="px-3 py-3 sm:px-5 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <h1 className="text-base font-semibold tracking-tight sm:text-2xl">
            {pack.title}
          </h1>
          <Badge className="text-[11px]">{pack.beatCount} beats</Badge>
        </div>
        <ShareDialog title={pack.title} url={pageUrl} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-border/40 pt-3">
        <Link
          href={
            pack.producerUsername ? `/producer/${pack.producerUsername}` : "#"
          }
          className="inline-flex items-center gap-2 rounded-lg transition hover:bg-accent px-1.5 py-1 -mx-1.5"
        >
          <div className="relative h-7 w-7 overflow-hidden rounded-full bg-muted ring-1 ring-border/40">
            {pack.producerAvatarUrl ? (
              <Image
                src={pack.producerAvatarUrl}
                alt={pack.producerName || "Producer"}
                fill
                className="object-cover"
                sizes="28px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-muted-foreground">
                {pack.producerName?.charAt(0)?.toUpperCase() || "P"}
              </div>
            )}
          </div>
          {pack.producerName &&
            !pack.producerName.toLowerCase().includes("unknown") && (
              <span className="text-sm font-medium">{pack.producerName}</span>
            )}
        </Link>
        <div className="flex items-center gap-1.5">
          {pack.tags && pack.tags.length > 0 && (
            <div className="mr-1 hidden flex-wrap gap-1 sm:flex">
              {pack.tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag}
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  {tag}
                </Badge>
              ))}
              {pack.tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0"
                >
                  +{pack.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}