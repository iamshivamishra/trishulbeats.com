"use client";

import { Play } from "lucide-react";

interface YoutubeBeatItem {
  id: string;
  title: string;
}

const YOUTUBE_BEATS: YoutubeBeatItem[] = [
  { id: "LBpYDDPtzJ8", title: "Beat Video 1" },
  { id: "hDDfAaIilZA", title: "Beat Video 2" },
  { id: "92jdkMnYkfs", title: "Beat Video 3" },
  { id: "NokYYrE8b3k", title: "Beat Video 4" },
  { id: "I5S_ae0SyPA", title: "Beat Video 5" },
  { id: "LbOBSJ3ygag", title: "Beat Video 6" },
  { id: "dnDEdN7YwUo", title: "Beat Video 7" },
];

// Seamless loop ke liye list ko duplicate karte hain
const MARQUEE_ITEMS = [...YOUTUBE_BEATS, ...YOUTUBE_BEATS];

export default function YoutubeBeats() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">
            {/* Red YouTube Logo SVG */}
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

      <div className="yt-marquee-mask relative overflow-hidden">
        <div className="yt-marquee-track flex w-max gap-4">
          {MARQUEE_ITEMS.map((video, index) => (
            <a
              key={`${video.id}-${index}`}
              href={`https://youtu.be/${video.id}`}
              target="_blank"
              rel="noopener noreferrer"
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