"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface YoutubeBeatItem {
  id: string;
  title: string;
}

const YOUTUBE_BEATS: YoutubeBeatItem[] = [
  { id: "LBpYDDPtzJ8", title: "" },
  { id: "hDDfAaIilZA", title: "" },
  { id: "92jdkMnYkfs", title: "" },
  { id: "NokYYrE8b3k", title: "" },
  { id: "I5S_ae0SyPA", title: "" },
  { id: "LbOBSJ3ygag", title: "" },
  { id: "dnDEdN7YwUo", title: "" },
];

// Seamless loop ke liye list repeat ki gayi hai
const MARQUEE_ITEMS = [
  ...YOUTUBE_BEATS,
  ...YOUTUBE_BEATS,
  ...YOUTUBE_BEATS,
  ...YOUTUBE_BEATS,
];

export default function YoutubeBeats() {
  const containerRef = useRef<HTMLDivElement>(null);

  // States & Refs for Custom Scroll Loop
  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  
  // Speed parameter: +1 matlab Right-to-Left, -1 matlab Left-to-Right
  const speed = useRef(1);

  // Infinite Scroll & Animation Loop
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;

    const loop = () => {
      // Jab hover ya drag chal raha ho tab auto scroll ko pauze rakhenge
      if (!isHovered && !isDragging.current) {
        container.scrollLeft += speed.current;

        // Infinite seamless loop boundary condition
        const maxScroll = container.scrollWidth / 2;
        if (container.scrollLeft >= maxScroll) {
          container.scrollLeft -= maxScroll;
        } else if (container.scrollLeft <= 0) {
          container.scrollLeft += maxScroll;
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovered]);

  // Mouse / Touch Drag Event Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftStart.current = containerRef.current.scrollLeft;
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    e.preventDefault();

    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5; // Drag Sensitivity

    // Dynamic Direction Logic: Jis taraf drag karoge speed/direction update ho jayegi
    if (walk < 0) {
      speed.current = 1.2; // Right to Left scroll
    } else if (walk > 0) {
      speed.current = -1.2; // Left to Right scroll
    }

    containerRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
            <svg
              className="h-7 w-7 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="#FF0000"
              aria-hidden="true"
            >
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            YouTube
          </h2>
          <p className="mt-2 text-muted-foreground">
            Watch our latest beats and visuals on YouTube.
          </p>
        </div>
      </div>

      {/* Main Drag & Auto Scroll Track */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          isDragging.current = false;
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className="relative cursor-grab overflow-x-auto select-none scrollbar-none active:cursor-grabbing"
      >
        <div className="flex w-max gap-4 py-2">
          {MARQUEE_ITEMS.map((video, index) => (
            <a
              key={`${video.id}-${index}`}
              href={`https://youtu.be/${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
              draggable={false}
              className="group relative w-[260px] flex-shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card/80 transition hover:border-border hover:shadow-md sm:w-[300px]"
            >
              <div className="relative aspect-video w-full bg-muted/30">
                <img
                  src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                  alt={video.title}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  draggable={false}
                  loading="lazy"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition group-hover:opacity-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600/90">
                    <Play className="h-5 w-5 fill-white text-white" />
                  </div>
                </div>
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-medium">{video.title}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}