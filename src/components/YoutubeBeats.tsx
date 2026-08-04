"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Spotlight } from "@/components/ui/spotlight";

function getYoutubeId(url: string): string {
  if (!url) return "";
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : "";
}

interface YoutubeBeatItem {
  url: string;
  title: string;
}

const YOUTUBE_BEATS: YoutubeBeatItem[] = [
  { url: "https://youtu.be/PXPRLsYOofg?si=gUZIvsK5u_NAqyQP", title: "" },
  { url: "https://youtu.be/dPSx6fM8QQw?si=7sVaHBnHLyuNtKyL", title: "" },
  { url: "https://youtu.be/2WMbKwyhCpE?si=dQJpKLwtwsjaLwdx", title: "" },
  { url: "https://youtu.be/dnDEdN7YwUo?si=dhOmJ9-Usqrbf4S9", title: "" },
  { url: "https://youtu.be/LqnzDFPdwUE?si=ln-wIFlRYsTwHgSY", title: "" },
  { url: "https://youtu.be/LbOBSJ3ygag?si=qXM9iUopdHvMcSoO", title: "" },
  { url: "https://youtu.be/I5S_ae0SyPA?si=9SoXCTWm0IRPIE1T", title: "" },
  { url: "https://youtu.be/92jdkMnYkfs?si=x2RSj-fEVHFFvpdR", title: "" },
  { url: "https://youtu.be/NokYYrE8b3k?si=PCEcdXWJId8GkYXI", title: "" },
];

const MARQUEE_ITEMS = [
  ...YOUTUBE_BEATS,
  ...YOUTUBE_BEATS,
  ...YOUTUBE_BEATS,
  ...YOUTUBE_BEATS,
];

function buildThumbCandidates(videoId: string): string[] {
  return [`/api/youtube-thumbnail/${videoId}`];
}

function YoutubeThumbnail({ videoId, title }: { videoId: string; title: string }) {
  const candidates = useRef(buildThumbCandidates(videoId));
  const [srcIndex, setSrcIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (srcIndex < candidates.current.length - 1) {
      setSrcIndex((i) => i + 1);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-red-950/40 to-black">
        <svg
          className="h-8 w-8 text-red-500/70"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        <span className="text-xs text-zinc-400">{title}</span>
      </div>
    );
  }

  return (
    <img
      key={srcIndex}
      src={candidates.current[srcIndex]}
      onError={handleError}
      alt={title || "YouTube Beat"}
      className="h-full w-full object-cover transition group-hover:scale-105"
      draggable={false}
    />
  );
}

export default function YoutubeBeats() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const speed = useRef(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let animationFrameId: number;

    const loop = () => {
      if (!isHovered && !isDragging.current) {
        container.scrollLeft += speed.current;

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

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    isDragging.current = true;
    hasDragged.current = false;
    startX.current = e.pageX - containerRef.current.offsetLeft;
    scrollLeftStart.current = containerRef.current.scrollLeft;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;

    const x = e.pageX - containerRef.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;

    if (Math.abs(walk) > 5) {
      hasDragged.current = true;
    }

    containerRef.current.scrollLeft = scrollLeftStart.current - walk;
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (hasDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 py-10 sm:px-6 lg:px-8">
      <Spotlight
        className="-top-20 right-0 md:right-40 md:-top-10 opacity-60"
        fill="oklch(0.56 0.21 24 / 0.2)"
      />
      <div className="relative z-10 mb-6 flex items-end justify-between">
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

      {/* Main Drag & Auto Scroll Track — fades at edges */}
      <div
        ref={containerRef}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          isDragging.current = false;
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setIsHovered(false)}
        className="relative cursor-grab overflow-x-auto select-none scrollbar-none active:cursor-grabbing [mask-image:linear-gradient(to_right,transparent,white_5%,white_95%,transparent)]"
      >
        <div className="flex w-max gap-4 py-2">
          {MARQUEE_ITEMS.map((video, index) => {
            const videoId = getYoutubeId(video.url);

            return (
              <a
                key={`${videoId}-${index}`}
                href={video.url}
                target="_blank"
                rel="noopener noreferrer"
                draggable={false}
                onClick={handleCardClick}
                className="group relative w-[260px] flex-shrink-0 overflow-hidden rounded-xl border border-border/50 bg-card/80 transition hover:border-red-500/50 hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.4)] sm:w-[300px]"
              >
                <div className="relative aspect-video w-full bg-muted/30">
                  {videoId ? (
                    <YoutubeThumbnail videoId={videoId} title={video.title} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs text-zinc-400">
                      Invalid Video
                    </div>
                  )}
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
