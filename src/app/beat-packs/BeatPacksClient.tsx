"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpDown, CirclePause, CirclePlay, Layers, Loader2, Music, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAudioActions } from "@/components/AudioPlayerContext";
import type { BeatPackUi } from "@/features/beats/beat-pack-ui";

interface Props {
  packs: BeatPackUi[];
  hasMore: boolean;
}

export default function BeatPacksClient({ packs, hasMore }: Props) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc" | "beats_desc">("newest");
  const [allPacks, setAllPacks] = useState(packs);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [canLoadMore, setCanLoadMore] = useState(hasMore);
  const { playBeat, currentBeat, isPlaying } = useAudioActions();

  const handlePreviewToggle = (pack: BeatPackUi) => {
    const track = pack.tracks[0];
    if (!track?.previewUrl) return;
    playBeat({
      id: track.id,
      title: `${pack.title} — ${track.title}`,
      producerName: pack.producerName,
      coverUrl: pack.imageUrls?.[0] || pack.coverUrl,
      previewUrl: track.previewUrl,
    });
  };

  const handleLoadMore = async () => {
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/beat-packs?page=${nextPage}&limit=24`);
      const data = await res.json();
      setAllPacks((prev) => [...prev, ...data.packs]);
      setCanLoadMore(data.hasNext);
      setPage(nextPage);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  const filteredPacks = useMemo(() => {
    const term = search.trim().toLowerCase();
    let next = allPacks.filter((pack) => {
      if (!term) return true;
      const haystack = `${pack.title} ${pack.description} ${pack.producerName} ${pack.tags.join(" ")}`.toLowerCase();
      return haystack.includes(term);
    });
    next = [...next].sort((a, b) => {
      if (sortBy === "newest") return 0;
      if (sortBy === "beats_desc") return b.beatCount - a.beatCount;
      const aMin = Math.min(...a.prices.map((price) => price.price));
      const bMin = Math.min(...b.prices.map((price) => price.price));
      if (sortBy === "price_asc") return aMin - bMin;
      if (sortBy === "price_desc") return bMin - aMin;
      return 0;
    });
    return next;
  }, [allPacks, search, sortBy]);

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Beat Packs</h1>
          <p className="text-muted-foreground">
            Purchase curated collections and unlock all beats inside each pack.
          </p>
        </div>
        <Button asChild variant="outline">
          {/* <Link href="/beats">
            Browse Single Beats
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Link> */}
        </Button>
      </div>

      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 sm:flex-1">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
            placeholder="Search packs by title, producer, or tags"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as "newest" | "price_asc" | "price_desc" | "beats_desc")}>
          <SelectTrigger className="w-[160px]">
            <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="price_asc">Lowest price</SelectItem>
            <SelectItem value="price_desc">Highest price</SelectItem>
            <SelectItem value="beats_desc">Most beats</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {allPacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Layers className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <h2 className="text-xl font-semibold">No beat packs available yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Producers haven&apos;t published any beat packs yet. Check back soon or browse individual beats.
            </p>
          </div>
          <Button asChild>
            <Link href="/beats">Browse Single Beats</Link>
          </Button>
        </div>
      ) : filteredPacks.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <div>
            <h2 className="text-xl font-semibold">No packs match your search</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different search term or clear your search.
            </p>
          </div>
          <Button variant="outline" onClick={() => setSearch("")}>
            Clear Search
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPacks.map((pack) => (
              <Card key={pack.id} className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
                {/* Image Section Wrapped Separately */}
                <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl border-b border-border/40 bg-muted/30">
                  <Link
                    href={`/beat-packs/${pack.id}`}
                    className="block h-full w-full"
                  >
                    {(pack.imageUrls?.[0] || pack.coverUrl) ? (
                      <Image
                        src={pack.imageUrls?.[0] || pack.coverUrl!}
                        alt={pack.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition-transform duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Layers className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                    )}
                  </Link>

                  {/* Play/Pause Button as an overlay above the Link */}
                  {pack.tracks[0]?.previewUrl && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handlePreviewToggle(pack);
                      }}
                      className="absolute bottom-2 right-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm transition hover:bg-background"
                      aria-label={currentBeat?.id === pack.tracks[0]?.id && isPlaying ? "Pause preview" : "Play preview"}
                    >
                      {currentBeat?.id === pack.tracks[0]?.id && isPlaying ? (
                        <CirclePause className="h-5 w-5 text-primary" />
                      ) : (
                        <CirclePlay className="h-5 w-5 text-primary" />
                      )}
                    </button>
                  )}
                </div>

                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{pack.title}</CardTitle>
                    <Badge variant="secondary">{pack.beatCount} beats</Badge>
                  </div>
                  <p className="line-clamp-3 text-sm text-muted-foreground">{pack.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-1.5">
                    {pack.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="rounded-xl border border-border/60 bg-background/50 p-3">
                    <p className="mb-1 text-xs uppercase tracking-wider text-muted-foreground">
                      Starting at
                    </p>
                    <p className="text-xl font-bold text-primary">
                      ₹{Math.min(...pack.prices.map((price) => price.price)).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5" />
                      by {pack.producerName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Music className="h-3.5 w-3.5" />
                      {pack.tracks[0]?.genre || "Mixed"}
                    </span>
                  </div>

                  <Button asChild className="w-full">
                    <Link href={`/beat-packs/${pack.id}`}>View Pack</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {canLoadMore && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load More"
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}