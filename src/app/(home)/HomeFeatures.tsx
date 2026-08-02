"use client";

import { Headphones, Music, Zap, Search, ShoppingCart, Download } from "lucide-react";
import { useRef, useState } from "react";
import { Meteors } from "@/components/ui/meteors";

const FEATURES = [
  { icon: Headphones, title: "Free Previews", desc: "Listen to tagged previews before you buy. No account needed." },
  { icon: Music, title: "All Genres", desc: "Hip Hop, Trap, R&B, Lo-Fi, Drill, and more — find your sound." },
  { icon: Zap, title: "Instant License", desc: "Purchase a license and get immediate download access to the full track." },
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

function SpotlightCard({ children }: { children: React.ReactNode }) {
  const divRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:border-primary/30"
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300"
        style={{
          opacity,
          background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, oklch(0.56 0.21 24 / 0.08), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

export default function HomeFeatures() {
  return (
    <>
      <section className="app-container py-16">
        <div className="grid gap-6 sm:grid-cols-3">
          {FEATURES.map((feat) => (
            <SpotlightCard key={feat.title}>
              <feat.icon className="mb-3 h-8 w-8 text-primary" />
              <h2 className="text-lg font-semibold">{feat.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{feat.desc}</p>
            </SpotlightCard>
          ))}
        </div>
      </section>

      <section className="app-container py-16">
        <h2 className="mb-10 text-center text-3xl font-bold">How It Works</h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 p-8 text-center">
              <div className="relative z-10">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  Step {i + 1}
                </div>
                <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </div>
              <Meteors number={10} />
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
