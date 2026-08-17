"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

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

const CARD_STEP = 444; // ~card width (420) + gap (24), used to normalize distance
const AUTOPLAY_INTERVAL_MS = 4000; // gap between each automatic "nudge"

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
  const isAnimatingScroll = useRef(false);
  const scrollAnimFrame = useRef<number | null>(null);

  // Measures the pixel width of one ITEMS set (5 cards + gaps) so we know
  // how far to silently rewind/advance when we hit the loop boundary.
  const measureSetWidth = useCallback(() => {
  const scroller = scrollerRef.current;
  if (!scroller) return;
  setWidthRef.current = scroller.scrollWidth / REPEAT_COUNT;

  // Start in the middle repeat, and precisely CENTER that starting card
  // under the viewport — not just jump to the set boundary — so mobile
  // screens (where padding math is less forgiving) align correctly too.
  if (scroller.scrollLeft === 0) {
    const middleIndex = Math.floor(REPEAT_COUNT / 2) * ITEMS.length;
    const startCard = cardRefs.current[middleIndex];
    if (startCard) {
      scroller.scrollLeft =
        startCard.offsetLeft - scroller.clientWidth / 2 + startCard.clientWidth / 2;
    } else {
      scroller.scrollLeft = setWidthRef.current * Math.floor(REPEAT_COUNT / 2);
    }
  }
}, []);

  // If we've scrolled past one full set in either direction, jump back by
  // exactly one set-width. Since the content repeats identically, this is
  // visually seamless — the user never sees a "reset".
  const wrapIfNeeded = useCallback(() => {
    if (isAnimatingScroll.current) return;
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

  // Custom eased smooth-scroll — gives us full control over the animation
  // (unlike native scrollIntoView) so the wrap-around loop logic never
  // interrupts it mid-flight, and the motion is a real ease-out curve
  // rather than the browser's default (often abrupt) smooth scroll.
  // This is the SAME function used by manual drag/arrow clicks AND by
  // autoplay below, so both feel identical.
  const animateScrollTo = useCallback((targetScrollLeft: number, duration = 550) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    if (scrollAnimFrame.current) cancelAnimationFrame(scrollAnimFrame.current);
    isAnimatingScroll.current = true;

    const startScrollLeft = scroller.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();

    // ease-out cubic — starts fast, settles in gently, feels natural
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      scroller.scrollLeft = startScrollLeft + distance * ease(t);

      if (t < 1) {
        scrollAnimFrame.current = requestAnimationFrame(step);
      } else {
        isAnimatingScroll.current = false;
        scrollAnimFrame.current = null;
        wrapIfNeeded();
      }
    };

    scrollAnimFrame.current = requestAnimationFrame(step);
  }, [wrapIfNeeded]);

  // Scrolls a given card element to the exact horizontal center of the
  // scroller — this is what makes "left se center tak" animation happen.
  const centerCard = useCallback(
    (card: HTMLDivElement | null) => {
      const scroller = scrollerRef.current;
      if (!scroller || !card) return;
      const target = card.offsetLeft - scroller.clientWidth / 2 + card.clientWidth / 2;
      animateScrollTo(target);
    },
    [animateScrollTo]
  );

 const nudge = useCallback(
  (dir: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    animateScrollTo(scroller.scrollLeft + dir * CARD_STEP, 380); // 380ms duration add kiya, pehle default 550 tha
  },
  [animateScrollTo]
);
  // Infinite autoplay loop — advances one card at a time using the exact
  // same eased animation as a manual arrow click, then waits, then goes
  // again, forever. Pauses while the user is hovering or dragging, and
  // resumes automatically a bit after they let go — so it never truly
  // "stops", it just yields to manual interaction.
  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      if (autoPlay.current && !isHovered.current && !isDragging.current) {
        nudge(1);
      }
      autoPlayTimeout.current = setTimeout(tick, AUTOPLAY_INTERVAL_MS);
    };

    autoPlayTimeout.current = setTimeout(tick, AUTOPLAY_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (autoPlayTimeout.current) clearTimeout(autoPlayTimeout.current);
    };
  }, [nudge]);

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
    centerCard(cardRefs.current[index]);
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

    centerCard(cardRefs.current[bestIdx]);
  };

  const handleArrowClick = (dir: 1 | -1) => {
    pauseAutoplay();
    nudge(dir);
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
      {/* Background Ambient Glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="mb-14 text-center">
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-950/40 px-5 py-2.5 shadow-[0_0_20px_-5px_rgba(52,211,153,0.4)]">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-bold tracking-wide text-emerald-400 sm:text-base">
              REAL PURCHASES
            </span>
          </div>
        </div>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          People Are Buying Right Now
        </h2>
        <p className="mt-3 text-base text-slate-400 sm:text-lg max-w-lg mx-auto">
          Every purchase is verified and secured — drag left or right to see proof.
        </p>
      </div>

      {/* Native scroll + drag track — infinite loop via silent wraparound */}
      <div className="relative mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => handleArrowClick(-1)}
          aria-label="Scroll left"
          className="absolute left-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 backdrop-blur-md outline-none transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:outline-none sm:left-3 sm:p-2.5"
        >
          <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>
        <button
          type="button"
          onClick={() => handleArrowClick(1)}
          aria-label="Scroll right"
          className="absolute right-1 top-1/2 z-20 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white/80 backdrop-blur-md outline-none transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:outline-none sm:right-3 sm:p-2.5"
        >
          <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
        </button>

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
          className="flex cursor-grab select-none items-center gap-6 overflow-x-auto px-[10vw] py-6 scrollbar-none active:cursor-grabbing sm:py-10 [mask-image:linear-gradient(to_right,transparent,white_8%,white_92%,transparent)]"
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
                className="flex-shrink-0 cursor-pointer outline-none will-change-transform"
                style={{ transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease" }}
              >
                <div className="relative h-[440px] w-[340px] overflow-hidden rounded-xl shadow-xl sm:h-[560px] sm:w-[420px]">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="h-full w-full object-contain"
                    draggable={false}
                  />
                </div>

                <div className="mt-4 text-center">
                  <p
                    className={`font-extrabold text-white transition-all duration-300 ${
                      isActive ? "text-2xl" : "text-base"
                    }`}
                  >
                    {item.title}
                  </p>
                  <p
                    className={`font-semibold text-white/70 transition-all duration-300 ${
                      isActive ? "text-base mt-1" : "text-xs"
                    }`}
                  >
                    {item.subtitle}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
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