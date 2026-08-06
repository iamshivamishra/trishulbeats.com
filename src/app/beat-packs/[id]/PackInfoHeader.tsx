"use client";

import { Badge } from "@/components/ui/badge";
import ShareDialog from "@/components/ShareDialog";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

interface PackInfoHeaderProps {
  pack: Pick<BeatPackUi, "title" | "beatCount">;
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
    </div>
  );
}