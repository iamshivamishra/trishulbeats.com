"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface StaggerRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Base delay before first child animates (ms) */
  baseDelay?: number;
  /** Delay between each child (ms) */
  staggerDelay?: number;
  /** IntersectionObserver threshold */
  threshold?: number;
}

export default function StaggerReveal({
  children,
  className,
  baseDelay = 0,
  staggerDelay = 75,
  threshold = 0.1,
}: StaggerRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold, rootMargin: "0px 0px -50px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return (
    <div ref={ref} className={cn(className)}>
      {React.Children.map(children, (child, i) => (
        <div
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: `opacity 0.5s ease-out ${baseDelay + i * staggerDelay}ms, transform 0.5s ease-out ${baseDelay + i * staggerDelay}ms`,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
