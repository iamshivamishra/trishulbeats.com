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

function drawWaveform(
  canvas: HTMLCanvasElement,
  bars: number[],
  progressRatio: number,
  hoveringAt: number | null,
  barColor: string,
  progressColor: string,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const width = rect.width;
  const height = rect.height;
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

  if (hoveringAt !== null) {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, hoveringAt, height);
  }
}

function formatTime(seconds: number): string {
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
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
  const rafRef = useRef<number>(0);
  const [loaded, setLoaded] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [hoverX, setHoverX] = useState(0);

  // Store latest values in refs to avoid re-render-driven redraws
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const hoverXRef = useRef<number | null>(null);

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

  // rAF-driven canvas redraw — decoupled from React state
  useEffect(() => {
    let running = true;

    const tick = () => {
      if (!running) return;
      const canvas = canvasRef.current;
      if (canvas && barsRef.current.length > 0) {
        const dur = durationRef.current;
        const progressRatio = dur > 0 ? progressRef.current / dur : 0;
        drawWaveform(canvas, barsRef.current, progressRatio, hoverXRef.current, barColor, progressColor);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      running = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [loaded, barColor, progressColor]);

  const handleInteraction = useCallback(
    (clientX: number) => {
      const canvas = canvasRef.current;
      if (!canvas || durationRef.current <= 0) return;
      const rect = canvas.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const time = (x / rect.width) * durationRef.current;
      onSeek(time);
    },
    [onSeek]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      hoverXRef.current = x;
      setHoverX(x);
    },
    []
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative cursor-pointer select-none", className)}
      onMouseEnter={() => { setHovering(true); hoverXRef.current = 0; }}
      onMouseLeave={() => { setHovering(false); hoverXRef.current = null; }}
      onMouseMove={handleMouseMove}
      onClick={(e) => handleInteraction(e.clientX)}
    >
      <canvas ref={canvasRef} className="h-full w-full" />

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
