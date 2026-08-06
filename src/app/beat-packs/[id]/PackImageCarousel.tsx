"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PackImageCarouselProps {
  title: string;
  coverUrl?: string;
  imageUrls?: string[];
}

export default function PackImageCarousel({
  title,
  coverUrl,
  imageUrls,
}: PackImageCarouselProps) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const lightboxTouchStartX = useRef(0);
  const lightboxTouchDeltaX = useRef(0);
  const lightboxMouseDown = useRef(false);
  const lightboxMouseStartX = useRef(0);
  const lightboxMouseDeltaX = useRef(0);

  const allImages = useMemo(() => {
    const imgs = [...(imageUrls ?? [])];
    if (imgs.length === 0 && coverUrl) imgs.push(coverUrl);
    return imgs;
  }, [imageUrls, coverUrl]);

  const goToPrev = useCallback(
    () => setCarouselIndex((i) => Math.max(0, i - 1)),
    [],
  );
  const goToNext = useCallback(
    () => setCarouselIndex((i) => Math.min(allImages.length - 1, i + 1)),
    [allImages.length],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (touchDeltaX.current > 50) goToPrev();
    else if (touchDeltaX.current < -50) goToNext();
    touchDeltaX.current = 0;
  }, [goToPrev, goToNext]);

  const handleLightboxTouchStart = useCallback((e: React.TouchEvent) => {
    lightboxTouchStartX.current = e.touches[0].clientX;
    lightboxTouchDeltaX.current = 0;
  }, []);

  const handleLightboxTouchMove = useCallback((e: React.TouchEvent) => {
    lightboxTouchDeltaX.current =
      e.touches[0].clientX - lightboxTouchStartX.current;
  }, []);

  const handleLightboxTouchEnd = useCallback(() => {
    if (lightboxTouchDeltaX.current > 50) goToPrev();
    else if (lightboxTouchDeltaX.current < -50) goToNext();
    lightboxTouchDeltaX.current = 0;
  }, [goToPrev, goToNext]);

  const handleLightboxMouseDown = useCallback((e: React.MouseEvent) => {
    lightboxMouseDown.current = true;
    lightboxMouseStartX.current = e.clientX;
    lightboxMouseDeltaX.current = 0;
  }, []);

  const handleLightboxMouseMove = useCallback((e: React.MouseEvent) => {
    if (!lightboxMouseDown.current) return;
    lightboxMouseDeltaX.current = e.clientX - lightboxMouseStartX.current;
  }, []);

  const handleLightboxMouseUp = useCallback(() => {
    if (!lightboxMouseDown.current) return;
    lightboxMouseDown.current = false;
    if (lightboxMouseDeltaX.current > 50) goToPrev();
    else if (lightboxMouseDeltaX.current < -50) goToNext();
    lightboxMouseDeltaX.current = 0;
  }, [goToPrev, goToNext]);

  if (allImages.length === 0) {
    return (
      <div className="flex aspect-[2/1] sm:aspect-video w-full items-center justify-center border-b border-border/40 bg-muted/30">
        <Layers className="h-10 w-10 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <div
          className="pack-cover-drop relative aspect-[2/1] sm:aspect-video w-full overflow-hidden border-b border-border/40 bg-muted/30 cursor-zoom-in"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={() => setLightboxOpen(true)}
        >
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {allImages.map((url, i) => (
              <div
                key={i}
                className="relative h-full w-full shrink-0 bg-black/5 dark:bg-white/5"
              >
                <Image
                  src={url}
                  alt={`${title} — image ${i + 1}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 65vw"
                  className="object-contain"
                  priority={i === 0}
                  loading={i === 0 ? "eager" : "lazy"}
                />
              </div>
            ))}
          </div>

          {allImages.length > 1 && (
            <>
              {carouselIndex > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToPrev();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 sm:h-9 sm:w-9"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
              {carouselIndex < allImages.length - 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goToNext();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70 sm:h-9 sm:w-9"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </>
          )}
        </div>

        {allImages.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 border-b border-border/40 px-3 py-2 sm:px-5">
            {allImages.map((url, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCarouselIndex(i)}
                className={`relative h-10 w-10 shrink-0 overflow-hidden rounded-md border-2 transition sm:h-14 sm:w-14 ${
                  i === carouselIndex
                    ? "border-primary ring-1 ring-primary/30"
                    : "border-transparent opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={url}
                  alt={`${title} — image ${i + 1}`}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden border-none bg-black/95">
          <DialogHeader className="sr-only">
            <DialogTitle>
              {title} — image {carouselIndex + 1}
            </DialogTitle>
          </DialogHeader>
          <div
            className="relative flex h-[80vh] w-full cursor-grab select-none items-center justify-center active:cursor-grabbing"
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
            onMouseDown={handleLightboxMouseDown}
            onMouseMove={handleLightboxMouseMove}
            onMouseUp={handleLightboxMouseUp}
            onMouseLeave={handleLightboxMouseUp}
          >
            {allImages.length > 0 && (
              <Image
                src={allImages[carouselIndex]}
                alt={`${title} — image ${carouselIndex + 1}`}
                fill
                sizes="95vw"
                draggable={false}
                className="pointer-events-none object-contain"
              />
            )}
            {allImages.length > 1 && (
              <>
                {carouselIndex > 0 && (
                  <button
                    type="button"
                    onClick={goToPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {carouselIndex < allImages.length - 1 && (
                  <button
                    type="button"
                    onClick={goToNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition hover:bg-black/70"
                    aria-label="Next image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                )}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-xs text-white">
                  {carouselIndex + 1} / {allImages.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}