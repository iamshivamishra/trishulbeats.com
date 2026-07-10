import type { Metadata } from "next";
import Link from "next/link";
import { beatFilterSchema, GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import { beatService } from "@/lib/services/beat.service";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { auth } from "@/lib/auth";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { toPublicBeatForUi } from "@/lib/serializers/beat";
import BeatCard from "@/components/BeatCard";
import { BeatsFilters } from "./BeatsFilters";

export const metadata: Metadata = {
  title: "Browse Beats",
  description: "Browse and preview high-quality beats across all genres.",
};

interface BeatsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BeatsPage({ searchParams }: BeatsPageProps) {
  const rawParams = await searchParams;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === "string") params[k] = v;
  }

  const filters = beatFilterSchema.parse(params);
  const result = await beatService.list(filters);

  const session = await auth();
  const purchasedIds = session?.user
    ? await purchaseRepository.getPurchasedBeatIds(session.user.id)
    : [];

// ...

const beatsWithPrices = await Promise.all(
  result.data.map(async (beat) => {
    const [cheapest, producer] = await Promise.all([
      licenseRepository.findCheapestForBeat(beat._id.toString()),
      userRepository.findById(beat.producerId.toString()),
    ]);
    return {
      beat: toPublicBeatForUi(beat, producer),
      startingPrice: cheapest?.price,
      isPurchased: purchasedIds.includes(beat._id.toString()),
    };
  })
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {beatsWithPrices.map(({ beat, startingPrice, isPurchased }) => (
                <BeatCard
                  key={beat._id.toString()}
                  beat={beat}
                  startingPrice={startingPrice}
                  isPurchased={isPurchased}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-lg font-medium">No beats found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or check back later.
              </p>
            </div>
          )}

          {/* Pagination */}
          {result.totalPages > 1 && (
            <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Beats pagination">
              {Array.from({ length: result.totalPages }, (_, i) => i + 1).map(
                (pageNum) => (
                  <Link
                    key={pageNum}
                    href={`/beats?${new URLSearchParams({ ...params, page: String(pageNum) })}`}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm font-medium transition-colors ${
                      pageNum === result.page
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-accent"
                    }`}
                    aria-current={pageNum === result.page ? "page" : undefined}
                  >
                    {pageNum}
                  </Link>
                )
              )}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
