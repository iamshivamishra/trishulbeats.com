"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentProps } from "react";
import BeatCard from "@/components/BeatCard";

interface BeatsGridClientProps {
  items: Array<{
    beat: ComponentProps<typeof BeatCard>["beat"];
    startingPrice: number | null;
  }>;
}

export default function BeatsGridClient({ items }: BeatsGridClientProps) {
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  const beatIds = useMemo(
    () => items.map((item) => item.beat._id.toString()),
    [items]
  );

  useEffect(() => {
    if (beatIds.length === 0) return;

    const controller = new AbortController();
    const params = new URLSearchParams({
      beatIds: beatIds.join(","),
    });

    fetch(`/api/user/purchases/ids?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) return { purchasedBeatIds: [] as string[] };
        return (await res.json()) as { purchasedBeatIds?: string[] };
      })
      .then((data) => {
        const next = new Set((data.purchasedBeatIds || []).map((id) => id.toString()));
        setPurchasedIds(next);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPurchasedIds(new Set());
      });

    return () => controller.abort();
  }, [beatIds]);

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map(({ beat, startingPrice }, index) => (
        <BeatCard
          key={beat._id.toString()}
          beat={beat}
          startingPrice={startingPrice ?? undefined}
          isPurchased={purchasedIds.has(beat._id.toString())}
          priority={index < 4}
        />
      ))}
    </div>
  );
}
