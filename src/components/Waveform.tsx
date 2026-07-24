"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";

interface WaveformProps {
  audioUrl: string;
  progress: number;
  duration: number;
  onSeek: (time: number) => void;
  className?: string;
  barColor?: string;
  progressColor?: string;
}

const BAR_WIDTH = 3;
const BAR_GAP = 1;
const BAR_MIN_HEIGHT = 2;

function generateFallbackBars(count: number): number[] {
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const wave =
      0.3 +
      0.3 * Math.sin(t * Math.PI * 4) +
      0.2 * Math.sin(t * Math.PI * 8) +
      0.1 * Math.random();
    bars.push(Math.min(1, Math.max(0.05, wave)));
  }
  return bars;
}

async function decodeAudioData(url: string): Promise<Float32Array | null> {
  try {
    const ctx = new AudioContext();
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);
    ctx.close();
    return channelData;
  } catch {
    return null;
  }
}

function computeBars(channelData: Float32Array, barCount: number): number[] {
  const blockSize = Math.floor(channelData.length / barCount);
  const bars: number[] = [];

  for (let i = 0; i < barCount; i++) {
    let sum = 0;
    const start = i * blockSize;
    for (let j = start; j < start + blockSize && j < channelData.length; j++) {
      sum += Math.abs(channelData[j]);
    }
    bars.push(sum / blockSize);
  }

  const maxVal = Math.max(...bars, 0.01);
  return bars.map((b) => Math.max(0.05, b / maxVal));
}

export default function Waveform({
  audioUrl,
  progress,
  duration,
  onSeek,
  className,
  barColor = "rgba(255,255,255,0.15)",
  progressColor = "hsl(var(--primary))",
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<number[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hoverX, setHoverX] = useState(0);

  const barCount = useCallback(() => {
    const width = containerRef.current?.clientWidth ?? 600;
    return Math.floor(width / (BAR_WIDTH + BAR_GAP));
  }, []);

  useEffect(() => {
    const count = barCount();
    barsRef.current = generateFallbackBars(count);
    setLoaded(false);

    decodeAudioData(audioUrl).then((data) => {
      if (data) {
        barsRef.current = computeBars(data, count);
      }
      setLoaded(true);
    });
  }, [audioUrl, barCount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const bars = barsRef.current;
    const progressRatio = duration > 0 ? progress / duration : 0;
    const progressX = progressRatio * width;

    ctx.clearRect(0, 0, width, height);

    bars.forEach((amplitude, i) => {
      const x = i * (BAR_WIDTH + BAR_GAP);
      const barHeight = Math.max(BAR_MIN_HEIGHT, amplitude * (height - 4));
      const y = (height - barHeight) / 2;

      ctx.fillStyle = x <= progressX ? progressColor : barColor;
      ctx.beginPath();
      ctx.roundRect(x, y, BAR_WIDTH, barHeight, 1);
      ctx.fill();
    });

    if (hovering && duration > 0) {
      ctx.fillStyle = "rgba(255,255,255,0.08)";
      ctx.fillRect(0, 0, hoverX, height);
    }
  }, [progress, duration, loaded, hovering, hoverX, barColor, progressColor]);

  const handleInteraction = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas || duration <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const time = (x / rect.width) * duration;
      onSeek(time);
    },
    [duration, onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      setHoverX(e.clientX - rect.left);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative cursor-pointer select-none", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseMove={handleMouseMove}
      onClick={(e) => handleInteraction(e.clientX)}
    >
      <canvas ref={canvasRef} className="h-full w-full" />

      {/* Hover time tooltip */}
      {hovering && duration > 0 && (
        <div
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-popover px-1.5 py-0.5 text-xs text-popover-foreground shadow"
          style={{ left: hoverX }}
        >
          {formatTime((hoverX / (containerRef.current?.clientWidth ?? 1)) * duration)}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}
