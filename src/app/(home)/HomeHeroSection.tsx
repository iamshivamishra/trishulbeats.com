import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { Spotlight } from "@/components/ui/spotlight";
import HeroTextReveal from "@/components/HeroTextReveal";

export default function HomeHeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/30 bg-background dark:bg-black/95">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="oklch(0.56 0.21 24 / 0.3)"
      />
      <div className="app-container relative z-10 py-24 sm:py-32">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4 animate-[fade-in-down_0.6s_ease-out_both]">
            Beat Marketplace
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            <HeroTextReveal text="Find the perfect" className="block" />
            <span className="block bg-gradient-to-r from-primary via-orange-500 to-pink-500 bg-clip-text text-transparent animate-[fade-in-up_0.8s_ease-out_0.4s_both]">
              beat for your track
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground animate-[fade-in-up_0.8s_ease-out_0.6s_both]">
            Discover high-quality beats from talented producers. Preview for free,
            license instantly, and start creating.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center animate-[fade-in-up_0.8s_ease-out_0.8s_both]">
            <Button asChild size="lg" className="group/btn relative px-8 overflow-hidden shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-shadow">
              <Link href="/beats">
                <span className="relative z-10 flex items-center">
                  Browse Beats <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </span>
                <span className="absolute inset-0 -z-0 bg-gradient-to-r from-primary via-orange-500 to-primary bg-[length:200%_100%] animate-[shimmer_2s_linear_infinite] opacity-0 group-hover/btn:opacity-100 transition-opacity" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/beat-packs">Explore Beat Packs</Link>
            </Button>
          </div>
        </div>
      </div>
      <BackgroundBeams className="opacity-40" />
    </section>
  );
}
