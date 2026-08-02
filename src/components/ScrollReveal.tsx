"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in ms before animation starts after entering viewport */
  delay?: number;
  /** Direction to animate from */
  direction?: "up" | "down" | "left" | "right";
  /** IntersectionObserver threshold (0-1) */
  threshold?: number;
}

const TRANSLATE_MAP = {
  up: "translateY(30px)",
  down: "translateY(-30px)",
  left: "translateX(30px)",
  right: "translateX(-30px)",
};

export default function ScrollReveal({
  children,
  className,
  delay = 0,
  direction = "up",
  threshold = 0.1,
}: ScrollRevealProps) {
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
    <div
      ref={ref}
      className={cn("will-change-[opacity,transform]", className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0) translateX(0)" : TRANSLATE_MAP[direction],
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
