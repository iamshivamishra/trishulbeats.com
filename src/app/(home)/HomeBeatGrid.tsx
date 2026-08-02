import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BeatCard from "@/components/BeatCard";
import type { IBeat } from "@/types";

interface HomeBeatGridProps {
  title: string;
  beats: { beat: IBeat; startingPrice?: number }[];
  viewAllHref: string;
  sectionClassName?: string;
}

export default function HomeBeatGrid({
  title, beats, viewAllHref, sectionClassName = "app-container py-16",
}: HomeBeatGridProps) {
  if (beats.length === 0) return null;

  return (
    <section className={sectionClassName}>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <Button asChild variant="ghost" size="sm">
          <Link href={viewAllHref}>
            See all <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {beats.map(({ beat, startingPrice }, index) => (
          <BeatCard
            key={beat._id.toString()}
            beat={beat}
            startingPrice={startingPrice}
            priority={index < 4}
          />
        ))}
      </div>
    </section>
  );
}
