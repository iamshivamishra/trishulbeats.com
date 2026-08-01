import Link from "next/link";
import {
  ArrowRight, Headphones, Music, Zap,
  Search, ShoppingCart, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import BeatCard from "@/components/BeatCard";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { toPublicBeatForUi } from "@/lib/serializers/beat";
import { userRepository } from "@/lib/repositories/user.repository";
import BeatPackSlider from "@/components/BeatPackSlider";
import YoutubeBeats from "@/components/YoutubeBeats";
import SpotifyShowcase from "@/components/SpotifyShowcase";
import PartnerBrands from "@/components/PartnerBrands";

export const revalidate = 120;

import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const GENRE_CARDS = [
  { name: "Pop", emoji: "🎵", color: "hsl(280, 80%, 55%)" },
  { name: "Rock", emoji: "🎸", color: "hsl(10, 80%, 55%)" },
  { name: "Hip Hop", emoji: "🎤", color: "hsl(200, 80%, 55%)" },
  { name: "Jazz", emoji: "🎷", color: "hsl(45, 80%, 50%)" },
  { name: "Electronic", emoji: "🎧", color: "hsl(170, 80%, 45%)" },
  { name: "R&B", emoji: "🎹", color: "hsl(330, 70%, 55%)" },
  { name: "Trap", emoji: "🔊", color: "hsl(25, 90%, 55%)" },
  { name: "Lo-Fi", emoji: "🌙", color: "hsl(220, 60%, 55%)" },
  { name: "Afrobeats", emoji: "🥁", color: "hsl(140, 70%, 45%)" },
];

const TESTIMONIALS = [
  {
    name: "Rahul Sharma",
    location: "Delhi",
    avatar: "👨‍🎤",
    stars: 5,
    quote:
      "Trishul Beats is amazing! The free previews help me decide before buying. Best music platform I've used.",
  },
  {
    name: "Priya Patel",
    location: "Mumbai",
    avatar: "👩‍🎤",
    stars: 5,
    quote:
      "Love the variety of genres. Found so many new artists I never knew about. Highly recommended!",
  },
  {
    name: "Arjun Singh",
    location: "Bangalore",
    avatar: "🧑‍💻",
    stars: 4,
    quote:
      "Super fast streaming, no buffering at all. The UI is clean and easy to use. Great app!",
  },
];

const STEPS = [
  {
    icon: Search,
    title: "Browse & Preview",
    desc: "Explore thousands of beats across genres. Listen to free previews before you commit.",
  },
  {
    icon: ShoppingCart,
    title: "Choose a License",
    desc: "Pick the license tier that fits your project — Basic, Premium, or Unlimited.",
  },
  {
    icon: Download,
    title: "Download & Create",
    desc: "Get instant access to WAV, MP3, and stems. Start creating your masterpiece.",
  },
];

async function getBeatsWithPrices(beats: Awaited<ReturnType<typeof beatRepository.findRecent>>) {
  if (beats.length === 0) return [];

  const beatIds = beats.map((b) => b._id.toString());
  const uniqueProducerIds = [...new Set(beats.map((b) => b.producerId.toString()))];

  const [cheapestMap, producers] = await Promise.all([
    licenseRepository.findCheapestForBeats(beatIds),
    userRepository.findByIds(uniqueProducerIds),
  ]);

  const producerMap = new Map(producers.map((p) => [p._id.toString(), p]));

  return beats.map((beat) => {
    const producer = producerMap.get(beat.producerId.toString()) ?? null;
    const cheapest = cheapestMap[beat._id.toString()];
    return {
      beat: toPublicBeatForUi(beat, producer),
      startingPrice: cheapest?.price,
    };
  });
}

export default async function HomePage() {
  const [recentBeats, trendingBeats, packResult] = await Promise.all([
    beatRepository.findRecent(8),
    beatRepository.findTrending(4),
    beatPackRepository.listPublished(1, 3),
  ]);

  const [recentWithPrices, trendingWithPrices] = await Promise.all([
    getBeatsWithPrices(recentBeats),
    getBeatsWithPrices(trendingBeats),
  ]);
  const packProducerIds = [...new Set(packResult.data.map((p) => p.producerId.toString()))];
  const packProducers = await userRepository.findByIds(packProducerIds);
  const packProducerMap = new Map(packProducers.map((p) => [p._id.toString(), p]));

  const featuredPacks = packResult.data.map((pack) => {
    const producer = packProducerMap.get(pack.producerId.toString());
    const minPrice = Math.min(pack.prices.basic, pack.prices.premium, pack.prices.unlimited);
    return {
      id: pack._id.toString(),
      title: pack.title,
      coverUrl: pack.coverUrl,
      beatCount: pack.beatIds.length,
      producerName: producer?.displayName || producer?.name || "Unknown",
      startingPrice: minPrice,
    };
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const trendingItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Trending Beats on Trishul Beats",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    numberOfItems: trendingWithPrices.length,
    itemListElement: trendingWithPrices.slice(0, 8).map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${appUrl}/beats/${item.beat._id}`,
      name: item.beat.title,
    })),
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(trendingItemList) }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.58_0.22_280_/_0.15),transparent_70%)]" />
        <div className="hero-doodle-layer pointer-events-none absolute inset-0" aria-hidden>
          <svg
            className="doodle-float absolute left-3 top-12 h-14 w-14 text-primary/20 sm:left-12 sm:top-14 sm:h-16 sm:w-16"
            viewBox="0 0 120 120"
            fill="none"
          >
            <circle cx="56" cy="62" r="25" stroke="currentColor" strokeWidth="2.2" />
            <path d="M28 56C28 44 37 34 48 34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M84 56C84 44 75 34 64 34" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <rect x="24" y="52" width="8" height="14" rx="4" fill="currentColor" />
            <rect x="80" y="52" width="8" height="14" rx="4" fill="currentColor" />
            <circle cx="48" cy="60" r="2.4" fill="currentColor" />
            <circle cx="64" cy="60" r="2.4" fill="currentColor" />
            <path d="M47 73C50 77 62 77 65 73" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <svg
            className="doodle-drift absolute right-[6%] top-8 hidden h-9 w-9 text-primary/15 sm:block sm:h-11 sm:w-11 md:right-[11%] md:top-14"
            style={{ animationDelay: "1.2s" }}
            viewBox="0 0 100 100"
            fill="none"
          >
            <circle cx="50" cy="56" r="18" stroke="currentColor" strokeWidth="2.2" />
            <circle cx="43" cy="54" r="2.2" fill="currentColor" />
            <circle cx="57" cy="54" r="2.2" fill="currentColor" />
            <path d="M43 63C45.5 66.5 54.5 66.5 57 63" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M37 39C37 31 42 25 48 25" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M63 39C63 31 58 25 52 25" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <svg
            className="doodle-drift absolute left-[20%] top-[22%] h-8 w-8 text-primary/15 sm:left-[24%] sm:top-[20%] sm:h-10 sm:w-10"
            style={{ animationDelay: "0.9s" }}
            viewBox="0 0 80 80"
            fill="none"
          >
            <path d="M8 42C18 30 30 30 40 42C50 54 62 54 72 42" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 56C18 44 30 44 40 56C50 68 62 68 72 56" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <svg
            className="doodle-float absolute bottom-[16%] right-[24%] hidden h-7 w-7 text-primary/15 sm:block sm:h-9 sm:w-9 md:right-[20%]"
            style={{ animationDelay: "1.6s" }}
            viewBox="0 0 64 64"
            fill="none"
          >
            <path d="M34 12V34C34 38.5 30.5 42 26 42C22 42 19 39.2 19 35.5C19 31.8 22 29 26 29C27.4 29 28.8 29.4 30 30.2V16L45 13V29C45 33.5 41.5 37 37 37C33 37 30 34.2 30 30.5C30 26.8 33 24 37 24C38.4 24 39.8 24.4 41 25.2V10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="doodle-pulse absolute left-[14%] top-[76%] h-1.5 w-1.5 rounded-full bg-primary/20 sm:h-2 sm:w-2" />
        </div>
        <div className="app-container relative py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              Beat Marketplace
            </Badge>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              Find the perfect
              <br />
              <span className="text-primary">beat for your track</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
              Discover high-quality beats from talented producers. Preview for free,
              license instantly, and start creating.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="px-8">
                <Link href="/beats">
                  Browse Beats <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/beat-packs">Explore Beat Packs</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Beats */}
      {trendingWithPrices.length > 0 && (
        <section className="app-container py-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Trending Beats</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/beats?sort=popular">
                See all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {trendingWithPrices.map(({ beat, startingPrice }, index) => (
              <BeatCard
                key={beat._id.toString()}
                beat={beat}
                startingPrice={startingPrice}
                priority={index < 4}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Beats */}
      {recentWithPrices.length > 0 && (
        <section className="app-container pb-16">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Recently Added</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/beats?sort=newest">
                See all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentWithPrices.map(({ beat, startingPrice }, index) => (
              <BeatCard
                key={beat._id.toString()}
                beat={beat}
                startingPrice={startingPrice}
                priority={index < 4}
              />
            ))}
          </div>
        </section>
      )}

      {/* Featured Beat Packs */}
      <BeatPackSlider packs={featuredPacks} />

      {/* Features */}
      <section className="app-container py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            { icon: Headphones, title: "Free Previews", desc: "Listen to tagged previews before you buy. No account needed." },
            { icon: Music, title: "All Genres", desc: "Hip Hop, Trap, R&B, Lo-Fi, Drill, and more — find your sound." },
            { icon: Zap, title: "Instant License", desc: "Purchase a license and get immediate download access to the full track." },
          ].map((feat) => (
            <div key={feat.title} className="rounded-xl border border-border/50 bg-card/50 p-6">
              <feat.icon className="mb-3 h-8 w-8 text-primary" />
              <h2 className="text-lg font-semibold">{feat.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="app-container py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                Step {i + 1}
              </div>
              <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* YouTube Beats */}
      <YoutubeBeats />

      {/* Spotify Showcase */}
      <SpotifyShowcase />

      <PartnerBrands />
    </div>
  );
}