"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface HeroTextRevealProps {
  text: string;
  className?: string;
}

export default function HeroTextReveal({ text, className }: HeroTextRevealProps) {
  const words = text.split(" ");

  return (
    <span className={cn("inline", className)}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block"
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.4,
            delay: i * 0.12,
            ease: [0.25, 0.4, 0.25, 1],
          }}
        >
          {word}{i < words.length - 1 ? "\u00A0" : ""}
        </motion.span>
      ))}
    </span>
  );
}
