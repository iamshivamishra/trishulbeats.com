import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Marketplace — Trishul Beats",
  description:
    "Browse and license high-quality beats from independent producers. Search by title, producer, genre, mood, BPM, and price.",
  openGraph: {
    title: "Beat Marketplace — Trishul Beats",
    description: "Discover and license beats from top producers.",
  },
};

interface MarketplacePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const rawParams = await searchParams;
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string") {
      params.set(key, value);
    }
  }

  const query = params.toString();
  permanentRedirect(query ? `/beats?${query}` : "/beats");
}
