"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Download, Users, Headphones } from "lucide-react";

interface StatItem {
  icon: React.ReactNode;
  value: number;
  suffix: string;
  label: string;
}

const STATS: StatItem[] = [
  { icon: <Music className="h-5 w-5" />, value: 500, suffix: "+", label: "Beats" },
  { icon: <Download className="h-5 w-5" />, value: 10000, suffix: "+", label: "Downloads" },
  { icon: <Users className="h-5 w-5" />, value: 50, suffix: "+", label: "Producers" },
  { icon: <Headphones className="h-5 w-5" />, value: 25000, suffix: "+", label: "Listeners" },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const duration = 1500;
          const startTime = performance.now();

          const animate = (now: number) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(eased * value));
            if (progress < 1) requestAnimationFrame(animate);
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  const formatted =
    count >= 10000
      ? `${(count / 1000).toFixed(count >= 10000 ? 0 : 1)}K`
      : count.toLocaleString("en-IN");

  return (
    <span ref={ref} className="tabular-nums">
      {formatted}{suffix}
    </span>
  );
}

export default function SocialProofStrip() {
  return (
    <section className="border-b border-border/30 bg-muted/30 py-8">
      <div className="app-container">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 text-center">
              <div className="flex items-center gap-2 text-primary">
                {stat.icon}
                <span className="text-2xl font-bold text-foreground sm:text-3xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </span>
              </div>
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
