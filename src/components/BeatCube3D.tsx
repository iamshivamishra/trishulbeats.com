"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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

// Items repeated several times so we always have real content on both
// sides to scroll into — this is what makes the loop feel infinite.
const REPEAT_COUNT = 5;
const LOOP_ITEMS: CoverflowItem[] = Array.from({ length: REPEAT_COUNT }, () => ITEMS).flat();

const CARD_STEP = 264; // ~card width (240) + gap (24), used to normalize distance
const AUTOPLAY_PX_PER_SEC = 45; // smooth, consistent speed regardless of frame rate

export default function BeatCube3D() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const setWidthRef = useRef(0); // width of ONE full ITEMS set, in px

  const [activeIndex, setActiveIndex] = useState(0);

  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const isHovered = useRef(false);
  const autoPlay = useRef(true);
  const autoPlayTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastActiveRef = useRef(0);

  // Measures the pixel width of one ITEMS set (5 cards + gaps) so we know
  // how far to silently rewind/advance when we hit the loop boundary.
  const measureSetWidth = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    setWidthRef.current = scroller.scrollWidth / REPEAT_COUNT;

    // Start in the middle repeat so there's always real content to drag
    // both left AND right from the very first render.
    if (scroller.scrollLeft === 0) {
      scroller.scrollLeft = setWidthRef.current * Math.floor(REPEAT_COUNT / 2);
    }
  }, []);

  // If we've scrolled past one full set in either direction, jump back by
  // exactly one set-width. Since the content repeats identically, this is
  // visually seamless — the user never sees a "reset".
  const wrapIfNeeded = useCallback(() => {
    const scroller = scrollerRef.current;
    const setWidth = setWidthRef.current;
    if (!scroller || !setWidth) return;

    const minSafe = setWidth * 0.5;
    const maxSafe = setWidth * (REPEAT_COUNT - 1.5);

    if (scroller.scrollLeft < minSafe) {
      scroller.scrollLeft += setWidth;
    } else if (scroller.scrollLeft > maxSafe) {
      scroller.scrollLeft -= setWidth;
    }
  }, []);

  // Directly mutates DOM styles instead of React state, so scale/opacity
  // updates happen every animation frame without triggering re-renders —
  // this is what keeps the drag/scroll buttery smooth.
  const updateVisualState = useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const rect = scroller.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;

    let closestIdx = 0;
    let closestDist = Infinity;

    cardRefs.current.forEach((card, i) => {
      if (!card) return;
      const cardRect = card.getBoundingClientRect();
      const cardCenter = cardRect.left + cardRect.width / 2;
      const dist = Math.abs(cardCenter - centerX);
      const norm = Math.min(dist / CARD_STEP, 2);

      const scale = 1 - norm * 0.18;
      const opacity = Math.max(1 - norm * 0.45, 0.35);

      card.style.transform = `scale(${scale})`;
      card.style.opacity = String(opacity);

      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    });

    const originalIdx = closestIdx % ITEMS.length;
    if (originalIdx !== lastActiveRef.current) {
      lastActiveRef.current = originalIdx;
      setActiveIndex(originalIdx);
    }
  }, []);

  useEffect(() => {
    measureSetWidth();
    updateVisualState();

    const scroller = scrollerRef.current;
    if (!scroller) return;

    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        wrapIfNeeded();
        updateVisualState();
      });
    };

    const onResize = () => {
      measureSetWidth();
      updateVisualState();
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(raf);
    };
  }, [measureSetWidth, updateVisualState, wrapIfNeeded]);

  // Smooth, frame-rate-independent autoplay — moves by real elapsed time,
  // wraps seamlessly instead of resetting to the start.
  useEffect(() => {
    let animationFrameId: number;
    let lastTime: number | null = null;

    const loop = (time: number) => {
      const scroller = scrollerRef.current;
      if (lastTime === null) lastTime = time;
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      if (scroller && autoPlay.current && !isHovered.current && !isDragging.current) {
        scroller.scrollLeft += AUTOPLAY_PX_PER_SEC * dt;
        wrapIfNeeded();
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [wrapIfNeeded]);

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const pauseAutoplay = () => {
    autoPlay.current = false;
    if (autoPlayTimeout.current) clearTimeout(autoPlayTimeout.current);
    autoPlayTimeout.current = setTimeout(() => {
      autoPlay.current = true;
    }, 2500);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollerRef.current) return;
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - scrollerRef.current.offsetLeft;
    scrollLeftStart.current = scrollerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollerRef.current) return;
    const x = e.pageX - scrollerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    if (Math.abs(walk) > 5) hasDragged.current = true;
    scrollerRef.current.scrollLeft = scrollLeftStart.current - walk;
    wrapIfNeeded();
    // keep drag anchor consistent after any silent wrap jump
    scrollLeftStart.current = scrollerRef.current.scrollLeft + walk;
  };

  const handleCardClick = (e: React.MouseEvent, index: number) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    pauseAutoplay();
    cardRefs.current[index]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  };

  const goTo = (originalIndex: number) => {
    pauseAutoplay();
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // Pick the repeated-card instance closest to current scroll position
    // so the dot always animates the shortest visual distance.
    let bestIdx = originalIndex;
    let bestDist = Infinity;
    cardRefs.current.forEach((card, i) => {
      if (!card || i % ITEMS.length !== originalIndex) return;
      const dist = Math.abs(card.offsetLeft - scroller.scrollLeft);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = i;
      }
    });

    cardRefs.current[bestIdx]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
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

      {/* Native scroll + drag track — infinite loop via silent wraparound */}
      <div
        ref={scrollerRef}
        onMouseEnter={() => {
          isHovered.current = true;
        }}
        onMouseLeave={() => {
          isHovered.current = false;
          isDragging.current = false;
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={() => {
          isHovered.current = true;
          pauseAutoplay();
        }}
        onTouchEnd={() => {
          isHovered.current = false;
        }}
        className="relative mx-auto flex max-w-6xl cursor-grab select-none items-center gap-6 overflow-x-auto px-[10vw] py-6 scrollbar-none active:cursor-grabbing sm:py-10 [mask-image:linear-gradient(to_right,transparent,white_8%,white_92%,transparent)]"
      >
        {LOOP_ITEMS.map((item, i) => {
          const isActive = i % ITEMS.length === activeIndex;
          return (
            <div
              key={i}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              onClick={(e) => handleCardClick(e, i)}
              draggable={false}
              className="flex-shrink-0 cursor-pointer will-change-transform"
              style={{ transition: "transform 0.15s ease-out, opacity 0.15s ease-out" }}
            >
              <div
                className={`relative h-[380px] w-[210px] overflow-hidden rounded-2xl border bg-[#00a86b] shadow-2xl transition-colors duration-300 sm:h-[440px] sm:w-[240px] ${
                  isActive ? "border-emerald-400/60 shadow-emerald-500/20" : "border-white/10"
                }`}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="h-full w-full object-contain object-top"
                  draggable={false}
                />
                <div
                  className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-opacity duration-300"
                  style={{ opacity: isActive ? 1 : 0 }}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  Verified
                </div>
              </div>

              <div className="mt-3 text-center">
                <p
                  className={`font-bold transition-all duration-300 ${
                    isActive ? "text-lg text-white" : "text-sm text-slate-400"
                  }`}
                >
                  {item.title}
                </p>
                <p
                  className={`transition-all duration-300 ${
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