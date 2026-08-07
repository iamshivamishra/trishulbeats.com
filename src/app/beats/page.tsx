import type { Metadata } from "next";
import Link from "next/link";
import { Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { beatFilterSchema, GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import { marketplaceService } from "@/lib/services/marketplace.service";
import { storageService } from "@/lib/services/storage.service";
import { BeatsFilters } from "./BeatsFilters";
import BeatsGridClient from "./BeatsGridClient";
import Pagination from "@/components/Pagination";

export const revalidate = 60;

interface BeatsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ searchParams }: BeatsPageProps): Promise<Metadata> {
  const rawParams = await searchParams;
  const genre = typeof rawParams.genre === "string" ? rawParams.genre : undefined;
  const mood = typeof rawParams.mood === "string" ? rawParams.mood : undefined;
  const search = typeof rawParams.search === "string" ? rawParams.search : undefined;
  const page = typeof rawParams.page === "string" ? rawParams.page : undefined;

  const parts: string[] = [];
  if (genre) parts.push(genre);
  if (mood) parts.push(mood);

  const titleSuffix = parts.length > 0 ? parts.join(" · ") + " Beats" : "Browse Beats";
  const title = page && page !== "1" ? `${titleSuffix} — Page ${page}` : titleSuffix;

  const descParts = ["Browse and preview high-quality beats"];
  if (genre) descParts.push(`in the ${genre} genre`);
  if (mood) descParts.push(`with a ${mood} mood`);
  descParts.push("on Trishul Beats.");
  const description = descParts.join(" ");

  // Only the base /beats URL should be canonical; filtered views point back to it
  const hasFilters = genre || mood || search || (page && page !== "1");

  return {
    title,
    description,
    alternates: { canonical: "/beats" },
    ...(hasFilters && { robots: { index: false, follow: true } }),
    openGraph: {
      title: `${titleSuffix} — Trishul Beats`,
      description,
    },
  };
}

export default async function BeatsPage({ searchParams }: BeatsPageProps) {
  const rawParams = await searchParams;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") params[k] = v;
  }

  const filters = beatFilterSchema.parse(params);
  const result = await marketplaceService.list(filters);

  const beatsWithPrices = await Promise.all(
    result.beats.map(async (beat) => ({
      beat: {
        ...beat,
        producerUsername: beat.producerUsername ?? undefined,
        coverUrl: await storageService.presignUrl(beat.coverUrl),
        audioTaggedUrl: await storageService.presignUrl(beat.audioTaggedUrl),
      },
      startingPrice: beat.startingPrice ?? null,
    }))
  );

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Browse Beats</h1>
        <p className="page-subtitle">
          {result.total} beats available
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-72">
          <BeatsFilters
            genres={[...GENRE_OPTIONS]}
            keys={[...KEY_OPTIONS]}
            moods={[...MOOD_OPTIONS]}
            currentFilters={params}
          />
        </aside>

        <div className="flex-1">
          {beatsWithPrices.length > 0 ? (
            <BeatsGridClient items={beatsWithPrices} />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Music className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <p className="text-lg font-medium">No beats match your filters</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Try adjusting your search or browse all available beats.
              </p>
              <div className="mt-6 flex gap-3">
                <Button asChild>
                  <Link href="/beats">Clear All Filters</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/beat-packs">Browse Beat Packs</Link>
                </Button>
              </div>
            </div>
          )}

          <Pagination
            currentPage={result.page}
            totalPages={result.totalPages}
            buildHref={(page) =>
              `/beats?${new URLSearchParams({ ...params, page: String(page) })}`
            }
          />
        </div>
      </div>
    </div>
  );
}
