import type { Metadata } from "next";
import { beatService } from "@/lib/services/beat.service";
import { beatPackRepository } from "@/lib/repositories/beat-pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import BeatPackSlider from "@/components/BeatPackSlider";
import YoutubeBeats from "@/components/YoutubeBeats";
import SpotifyShowcase from "@/components/SpotifyShowcase";
import PartnerBrands from "@/components/PartnerBrands";
import HomeHeroSection from "./(home)/HomeHeroSection";
import HomeBeatGrid from "./(home)/HomeBeatGrid";
import HomeFeatures from "./(home)/HomeFeatures";

export const revalidate = 120;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [recentBeats, trendingBeats, packResult] = await Promise.all([
    beatService.getRecent(8),
    beatService.getTrending(4),
    beatPackRepository.listPublished(1, 3),
  ]);

  const [recentWithPrices, trendingWithPrices] = await Promise.all([
    beatService.enrichWithPrices(recentBeats),
    beatService.enrichWithPrices(trendingBeats),
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
      producerName: producer?.displayName || producer?.name || "",
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

      <HomeHeroSection />

      <HomeBeatGrid
        title="Trending Beats"
        beats={trendingWithPrices}
        viewAllHref="/beats?sort=popular"
      />

      <HomeBeatGrid
        title="Recently Added"
        beats={recentWithPrices}
        viewAllHref="/beats?sort=newest"
        sectionClassName="app-container pb-16"
      />

      <BeatPackSlider packs={featuredPacks} />

      <HomeFeatures />

      <YoutubeBeats />
      <SpotifyShowcase />
      <PartnerBrands />
    </div>
  );
}
