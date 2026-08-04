"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Layers } from "lucide-react";

export interface BeatPackSliderItem {
  id: string;
  title: string;
  coverUrl?: string | null;
  beatCount: number;
  producerName: string;
  startingPrice: number;
}

const DRAG_THRESHOLD = 6;

export default function BeatPackSlider({ packs }: { packs: BeatPackSliderItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPointerDown = useRef(false);
  const isDraggingRef = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);

  const [dragActive, setDragActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Duplicate items for infinite seamless looping
  const displayPacks = packs.length < 5 ? [...packs, ...packs, ...packs, ...packs] : [...packs, ...packs];

  // --- 1. Initial Scroll Position to Middle ---
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      // Direct jump to halfway mark so it has space to move Left-to-Right immediately
      el.scrollLeft = el.scrollWidth / 2;
    }
  }, [packs.length]);

  // --- 2. Left-to-Right Auto-Scroll Logic ---
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || packs.length === 0) return;

    let animationFrameId: number;

    const scroll = () => {
      if (!isPointerDown.current && !isHovered) {
        // Left-to-Right movement: Decrement scrollLeft
        if (el.scrollLeft <= 0) {
          // Continuous Loop reset back to middle
          el.scrollLeft = el.scrollWidth / 2;
        } else {
          el.scrollLeft -= 1; // Speed control (e.g. 0.8 ya 1.5)
        }
      }
      animationFrameId = requestAnimationFrame(scroll);
    };

    animationFrameId = requestAnimationFrame(scroll);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovered, packs.length]);

  if (packs.length === 0) return null;

  const onPointerDown = (e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;

    isPointerDown.current = true;
    isDraggingRef.current = false;
    startX.current = e.clientX;
    startScrollLeft.current = el.scrollLeft;

    window.addEventListener("pointermove", onWindowPointerMove);
    window.addEventListener("pointerup", onWindowPointerUp);
  };

  const onWindowPointerMove = (e: PointerEvent) => {
    const el = scrollRef.current;
    if (!el || !isPointerDown.current) return;

    const dx = e.clientX - startX.current;

    if (!isDraggingRef.current && Math.abs(dx) > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
      setDragActive(true);
    }

    if (isDraggingRef.current) {
      el.scrollLeft = startScrollLeft.current - dx;
    }
  };

  const onWindowPointerUp = () => {
    isPointerDown.current = false;
    setDragActive(false);

    window.removeEventListener("pointermove", onWindowPointerMove);
    window.removeEventListener("pointerup", onWindowPointerUp);

    setTimeout(() => {
      isDraggingRef.current = false;
    }, 0);
  };

  const onLinkClickCapture = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold sm:text-3xl">Featured Beat Packs</h2>
          <p className="mt-2 text-muted-foreground">
            Curated collections — get more beats for less.
          </p>
        </div>
        <Link href="/beat-packs" className="text-sm font-medium text-primary hover:underline">
          View All →
        </Link>
      </div>

      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`no-scrollbar flex gap-4 overflow-x-auto pb-2 ${
          dragActive ? "cursor-grabbing select-none" : "cursor-grab"
        }`}
        style={{ scrollBehavior: "auto" }}
      >
        {displayPacks.map((pack, index) => (
          <Link
            key={`${pack.id}-${index}`}
            href={`/beat-packs/${pack.id}`}
            draggable={false}
            onClickCapture={onLinkClickCapture}
            className="group w-[75%] flex-shrink-0 sm:w-[45%] lg:w-[32%]"
          >
            <div className="overflow-hidden rounded-xl border border-border/50 bg-card/80 transition hover:border-border hover:shadow-md">
              <div className="relative aspect-video w-full bg-muted/30">
                {pack.coverUrl ? (
                  <Image
                    src={pack.coverUrl}
                    alt={pack.title}
                    fill
                    draggable={false}
                    sizes="(max-width: 768px) 75vw, 32vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Layers className="h-8 w-8 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="font-semibold transition-colors group-hover:text-primary">
                  {pack.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {pack.beatCount} beats • by {pack.producerName}
                </p>
                <p className="mt-2 text-sm font-bold text-primary">
                  Starting at ₹{pack.startingPrice.toLocaleString("en-IN")}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}