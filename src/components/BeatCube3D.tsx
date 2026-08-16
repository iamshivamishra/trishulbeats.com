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
  { imageUrl: CUBE_IMAGE, title: "License Granted", subtitle: "Commercial rights included" },
];

const SLOT_WIDTH = 220;
const DRAG_THRESHOLD = 60;

export default function BeatCube3D() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);

  const dragIntent = useRef<"none" | "horizontal" | "vertical">("none");
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);
  const pointerCaptured = useRef(false);
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
    dragIntent.current = "none";
    pointerCaptured.current = false;
    dragStartX.current = e.clientX;
    dragStartY.current = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const dx = e.clientX - dragStartX.current;
    const dy = e.clientY - dragStartY.current;

    if (dragIntent.current === "none") {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        dragIntent.current = "horizontal";
        setIsDragging(true);
        autoPlayRef.current = false;
        if (!pointerCaptured.current) {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          pointerCaptured.current = true;
        }
      } else {
        dragIntent.current = "vertical";
      }
    }

    if (dragIntent.current === "horizontal") {
      setDragOffset(dx);
    }
    // vertical intent → kuch mat karo, browser page ko normally scroll karega
  };

  const finishDrag = (e: React.PointerEvent) => {
    if (dragIntent.current === "horizontal") {
      if (dragOffset > DRAG_THRESHOLD) {
        setActiveIndex((prev) => (prev - 1 + ITEMS.length) % ITEMS.length);
      } else if (dragOffset < -DRAG_THRESHOLD) {
        setActiveIndex((prev) => (prev + 1) % ITEMS.length);
      }
    }
    if (pointerCaptured.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
      pointerCaptured.current = false;
    }
    dragIntent.current = "none";
    setIsDragging(false);
    setDragOffset(0);
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
      <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="mb-14 text-center">
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
        onPointerUp={finishDrag}
        onPointerLeave={(e) => {
          if (dragIntent.current === "horizontal") finishDrag(e);
        }}
        className={`relative mx-auto flex h-[480px] w-full max-w-5xl select-none items-center justify-center sm:h-[540px] ${
          isDragging ? "cursor-grabbing" : "cursor-grab"
        }`}
        style={{ perspective: "1200px", touchAction: "pan-y" }}
      >
        {ITEMS.map((item, i) => {
          const offset = i - activeIndex;
          let effOffset = offset;
          if (effOffset > ITEMS.length / 2) effOffset -= ITEMS.length;
          if (effOffset < -ITEMS.length / 2) effOffset += ITEMS.length;

          const isActive = effOffset === 0;
          const absOffset = Math.abs(effOffset);

          const liveOffsetPx = isDragging ? dragOffset : 0;
          const translateX = effOffset * SLOT_WIDTH + liveOffsetPx;
          const dragProgress = Math.max(-1, Math.min(1, liveOffsetPx / SLOT_WIDTH));
          const scale = isActive
            ? 1 - Math.abs(dragProgress) * 0.05
            : 0.75 - Math.min(absOffset - 1, 1) * 0.1;
          const rotateY = effOffset * -25 + dragProgress * -8;
          const opacity = absOffset > 2 ? 0 : isActive ? 1 : 0.5;
          const zIndex = 10 - absOffset;

          return (
            <div
              key={i}
              onClick={() => !isDragging && goTo(i)}
              className="absolute cursor-pointer"
              style={{
                transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
                opacity,
                zIndex,
                transition: isDragging
                  ? "none"
                  : "transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.55s ease",
              }}
            >
              <div
                className={`relative h-[380px] w-[210px] overflow-hidden rounded-2xl border bg-[#00a86b] shadow-2xl sm:h-[440px] sm:w-[240px] ${
                  isActive
                    ? "border-emerald-400/60 shadow-emerald-500/20"
                    : "border-white/10"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-contain object-top"
                  draggable={false}
                />
                {isActive && (
                  <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
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
            className={`h-2 rounded-full transition-all duration-300 ${
              i === activeIndex ? "w-6 bg-emerald-400" : "w-2 bg-white/20"
            }`}
          />
        ))}
      </div>
    </section>
  );
}