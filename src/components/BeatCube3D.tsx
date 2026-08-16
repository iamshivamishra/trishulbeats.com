"use client";

import { useRef, useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";

interface CoverflowItem {
  imageUrl: string;
  title: string;
  subtitle: string;
}

const CUBE_IMAGE = "/cube-1.jpeg";

const ITEMS: CoverflowItem[] = [
  { imageUrl: CUBE_IMAGE, title: "Verified Purchase", subtitle: "Beat bought moments ago" },
  { imageUrl: CUBE_IMAGE, title: "Real Buyer", subtitle: "Secured via Razorpay" },
  { imageUrl: CUBE_IMAGE, title: "Instant Delivery", subtitle: "Files unlocked immediately" },
  { imageUrl: CUBE_IMAGE, title: "100% Secure", subtitle: "Every order, guaranteed" },
];

export default function BeatCube3D() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragDelta = useRef(0);

  const autoPlayRef = useRef(true);

  useEffect(() => {
    const interval = setInterval(() => {
      if (autoPlayRef.current && !isDragging) {
        setActiveIndex((prev) => (prev + 1) % ITEMS.length);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    autoPlayRef.current = false;
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    dragDelta.current = e.clientX - dragStartX.current;
  };

  const handlePointerUp = () => {
    if (isDragging) {
      if (dragDelta.current > 60) {
        setActiveIndex((prev) => (prev - 1 + ITEMS.length) % ITEMS.length);
      } else if (dragDelta.current < -60) {
        setActiveIndex((prev) => (prev + 1) % ITEMS.length);
      }
    }
    setIsDragging(false);
    dragDelta.current = 0;
    setTimeout(() => {
      autoPlayRef.current = true;
    }, 2500);
  };

  const goTo = (index: number) => {
    autoPlayRef.current = false;
    setActiveIndex(index);
    setTimeout(() => {
      autoPlayRef.current = true;
    }, 2500);
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
      {/* Background Ambient Glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="mb-14 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300 backdrop-blur-md">
          <ShieldCheck className="h-3.5 w-3.5" />
          Real Purchases, Real Producers
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          People Are Buying Right Now
        </h2>
        <p className="mt-3 text-base text-slate-400 sm:text-lg max-w-lg mx-auto">
          Every purchase is verified and secured — drag left or right to see proof.
        </p>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={`relative mx-auto flex h-[380px] w-full max-w-4xl items-center justify-center touch-none select-none ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ perspective: "1200px" }}
      >
        {ITEMS.map((item, i) => {
          const offset = i - activeIndex;
          // Wraparound handling — sabse chota effective offset use karo
          let effOffset = offset;
          if (effOffset > ITEMS.length / 2) effOffset -= ITEMS.length;
          if (effOffset < -ITEMS.length / 2) effOffset += ITEMS.length;

          const isActive = effOffset === 0;
          const absOffset = Math.abs(effOffset);

          const translateX = effOffset * 190;
          const scale = isActive ? 1 : 0.72 - Math.min(absOffset - 1, 1) * 0.1;
          const rotateY = effOffset * -25;
          const opacity = absOffset > 2 ? 0 : isActive ? 1 : 0.5;
          const zIndex = 10 - absOffset;

          return (
            <div
              key={i}
              onClick={() => !isDragging && goTo(i)}
              className="absolute cursor-pointer transition-all duration-500 ease-out"
              style={{
                transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
                opacity,
                zIndex,
              }}
            >
              <div
                className={`relative h-[260px] w-[220px] overflow-hidden rounded-xl border shadow-2xl sm:h-[300px] sm:w-[260px] ${
                  isActive
                    ? "border-emerald-400/60 shadow-emerald-500/20"
                    : "border-white/10"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-cover"
                  draggable={false}
                />
                {isActive && (
                  <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-md">
                    <ShieldCheck className="h-3 w-3 text-emerald-400" />
                    Verified
                  </div>
                )}
              </div>

              <div className="mt-3 text-center">
                <p
                  className={`font-bold transition-all ${
                    isActive ? "text-lg text-white" : "text-sm text-slate-400"
                  }`}
                >
                  {item.title}
                </p>
                <p
                  className={`transition-all ${
                    isActive ? "text-sm text-slate-300" : "text-xs text-slate-500"
                  }`}
                >
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Dots */}
      <div className="mt-8 flex justify-center gap-2">
        {ITEMS.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === activeIndex ? "w-6 bg-emerald-400" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
}