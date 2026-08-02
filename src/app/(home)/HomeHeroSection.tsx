import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function HomeHeroSection() {
  return (
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
  );
}
