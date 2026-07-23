"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, SlidersHorizontal, X, Play, Clock, Music,
  ArrowUpDown, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { marketplaceApi } from "@/lib/api/marketplace";
import { formatDuration } from "@/lib/format";
import { GENRE_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";

interface MarketplaceBeat {
  _id: string;
  title: string;
  genre: string;
  bpm?: number;
  key?: string;
  mood?: string;
  duration: number;
  coverUrl?: string;
  plays: number;
  salesCount: number;
  tags: string[];
  startingPrice: number | null;
  producerName: string;
  producerUsername: string | null;
  createdAt: string;
  saleMode?: "single" | "pack_only";
}

interface Filters {
  search: string;
  producer: string;
  genre: string;
  mood: string;
  bpmMin: string;
  bpmMax: string;
  sort: string;
}

const INITIAL_FILTERS: Filters = {
  search: "",
  producer: "",
  genre: "",
  mood: "",
  bpmMin: "",
  bpmMax: "",
  sort: "newest",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Latest" },
  { value: "most_sold", label: "Most Sold" },
  { value: "price_asc", label: "Lowest Price" },
  { value: "popular", label: "Most Played" },
  { value: "price_desc", label: "Highest Price" },
];

const LIMIT = 12;

function BeatCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/50">
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function MarketplaceBeatCard({ beat }: { beat: MarketplaceBeat }) {
  const isPackOnly = beat.saleMode === "pack_only";
  return (
    <Link href={`/beats/${beat._id}`}>
      <Card className="group overflow-hidden border-border/50 bg-card/50 transition-all hover:border-primary/30 hover:bg-card">
        <div className="relative aspect-square overflow-hidden">
          {beat.coverUrl ? (
            <Image
              src={beat.coverUrl}
              alt={beat.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10">
              <Music className="h-12 w-12 text-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
            <div className="rounded-full bg-primary p-3">
              <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
            </div>
          </div>
          {isPackOnly && (
            <Badge className="absolute left-2 top-2 bg-amber-500 text-black">Pack Only</Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="truncate text-sm font-semibold">{beat.title}</h3>
          <p className="truncate text-xs text-muted-foreground">
            by{" "}
            <span className="text-foreground/70">
              {beat.producerName}
            </span>
          </p>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(beat.duration)}
            </span>
            {beat.bpm && <span>{beat.bpm} BPM</span>}
          </div>
          <div className="mt-2 flex items-center justify-between">
            <Badge variant="secondary" className="text-xs">{beat.genre}</Badge>
            {beat.startingPrice !== null && (
              <span className="text-sm font-bold text-primary">
                ₹{beat.startingPrice.toLocaleString()}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function FilterSidebar({
  filters,
  setFilter,
  clearFilters,
  hasActiveFilters,
}: {
  filters: Filters;
  setFilter: (key: keyof Filters, value: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
            <X className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search by title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Search Title</label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Beat title..."
            className="pl-8"
            value={filters.search}
            onChange={(e) => setFilter("search", e.target.value)}
          />
        </div>
      </div>

      {/* Search by producer */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Producer</label>
        <Input
          placeholder="Producer name..."
          value={filters.producer}
          onChange={(e) => setFilter("producer", e.target.value)}
        />
      </div>

      <Separator />

      {/* Genre */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Genre</label>
        <Select
          value={filters.genre || "all"}
          onValueChange={(v) => setFilter("genre", !v || v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All genres" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All genres</SelectItem>
            {GENRE_OPTIONS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Mood */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Mood</label>
        <Select
          value={filters.mood || "all"}
          onValueChange={(v) => setFilter("mood", !v || v === "all" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All moods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All moods</SelectItem>
            {MOOD_OPTIONS.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* BPM Range */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">BPM Range</label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="40"
            min={40}
            max={300}
            value={filters.bpmMin}
            onChange={(e) => setFilter("bpmMin", e.target.value)}
            className="h-8 text-xs"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="number"
            placeholder="300"
            min={40}
            max={300}
            value={filters.bpmMax}
            onChange={(e) => setFilter("bpmMax", e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

export default function MarketplaceClient() {
  const [filters, setFilters] = useState<Filters>(INITIAL_FILTERS);
  const [beats, setBeats] = useState<MarketplaceBeat[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const buildQueryString = useCallback(
    (p: number) => {
      const params = new URLSearchParams();
      if (filters.search) params.set("search", filters.search);
      if (filters.producer) params.set("producer", filters.producer);
      if (filters.genre) params.set("genre", filters.genre);
      if (filters.mood) params.set("mood", filters.mood);
      if (filters.bpmMin) params.set("bpmMin", filters.bpmMin);
      if (filters.bpmMax) params.set("bpmMax", filters.bpmMax);
      params.set("sort", filters.sort);
      params.set("page", String(p));
      params.set("limit", String(LIMIT));
      return params.toString();
    },
    [filters]
  );

  const fetchBeats = useCallback(
    async (p: number, append = false) => {
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const data = await marketplaceApi.list(buildQueryString(p));

        if (append) {
          setBeats((prev) => [...prev, ...data.beats]);
        } else {
          setBeats(data.beats);
        }
        setTotalCount(data.total);
        setHasMore(data.hasNext);
        setPage(data.page);
      } catch {
        /* network error — silently fail */
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [buildQueryString]
  );

  // Reset and fetch when filters change (with debounce for text inputs)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchBeats(1, false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchBeats]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          fetchBeats(page + 1, true);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, page, fetchBeats]);

  const setFilter = (key: keyof Filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(INITIAL_FILTERS);

  const hasActiveFilters =
    filters.search !== "" ||
    filters.producer !== "" ||
    filters.genre !== "" ||
    filters.mood !== "" ||
    filters.bpmMin !== "" ||
    filters.bpmMax !== "";

  const activeFilterCount = [
    filters.genre,
    filters.mood,
    filters.bpmMin || filters.bpmMax ? "bpm" : "",
    filters.producer,
  ].filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="mt-1 text-muted-foreground">
          {loading
            ? "Loading beats..."
            : `${totalCount.toLocaleString()} beats available`}
        </p>
      </div>

      {/* Top bar: mobile filter toggle + sort */}
      <div className="mb-6 flex items-center justify-between gap-3">
        {/* Mobile filter trigger */}
        <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
          <SheetTrigger className="lg:hidden inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterSidebar
                filters={filters}
                setFilter={(k, v) => {
                  setFilter(k, v);
                }}
                clearFilters={() => {
                  clearFilters();
                  setMobileFiltersOpen(false);
                }}
                hasActiveFilters={hasActiveFilters}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Desktop search bar */}
        <div className="hidden flex-1 lg:block" />

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <Select value={filters.sort} onValueChange={(v) => setFilter("sort", v ?? "newest")}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 lg:block">
          <div className="sticky top-24 rounded-xl border border-border/50 bg-card/50 p-4">
            <FilterSidebar
              filters={filters}
              setFilter={setFilter}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </aside>

        {/* Grid */}
        <div className="flex-1">
          {/* Active filter pills */}
          {hasActiveFilters && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {filters.search && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => setFilter("search", "")}
                >
                  &quot;{filters.search}&quot;
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {filters.producer && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => setFilter("producer", "")}
                >
                  Producer: {filters.producer}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {filters.genre && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => setFilter("genre", "")}
                >
                  {filters.genre}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {filters.mood && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => setFilter("mood", "")}
                >
                  {filters.mood}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {(filters.bpmMin || filters.bpmMax) && (
                <Badge
                  variant="secondary"
                  className="cursor-pointer gap-1"
                  onClick={() => {
                    setFilter("bpmMin", "");
                    setFilter("bpmMax", "");
                  }}
                >
                  BPM: {filters.bpmMin || "40"}–{filters.bpmMax || "300"}
                  <X className="h-3 w-3" />
                </Badge>
              )}
            </div>
          )}

          {/* Loading skeleton grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: LIMIT }).map((_, i) => (
                <BeatCardSkeleton key={i} />
              ))}
            </div>
          ) : beats.length > 0 ? (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {beats.map((beat) => (
                  <MarketplaceBeatCard key={beat._id} beat={beat} />
                ))}
              </div>

              {/* Infinite scroll sentinel */}
              <div ref={sentinelRef} className="flex justify-center py-8">
                {loadingMore && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading more beats...
                  </div>
                )}
                {!hasMore && beats.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You&apos;ve seen all {totalCount} beats
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Music className="mb-4 h-16 w-16 text-muted-foreground/30" />
              <p className="text-lg font-medium">No beats found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or search terms.
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
