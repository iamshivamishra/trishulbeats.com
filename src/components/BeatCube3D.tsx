"use client";

import { useRef, useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";

interface CubeFace {
  imageUrl?: string;
  gradient: string;
  borderColor: string;
  glowColor: string;
}

const CUBE_IMAGE = "/cube-1.jpeg";

const CUBE_FACES: CubeFace[] = [
  { imageUrl: CUBE_IMAGE, gradient: "from-red-600/80 via-orange-600/80 to-amber-500/80", borderColor: "border-orange-500/50", glowColor: "rgba(249,115,22,0.3)" },
  { imageUrl: CUBE_IMAGE, gradient: "from-purple-600/80 via-violet-600/80 to-indigo-500/80", borderColor: "border-purple-500/50", glowColor: "rgba(168,85,247,0.3)" },
  { imageUrl: CUBE_IMAGE, gradient: "from-cyan-600/80 via-teal-600/80 to-emerald-500/80", borderColor: "border-cyan-500/50", glowColor: "rgba(6,182,212,0.3)" },
  { imageUrl: CUBE_IMAGE, gradient: "from-pink-600/80 via-rose-600/80 to-red-500/80", borderColor: "border-pink-500/50", glowColor: "rgba(244,63,94,0.3)" },
  { imageUrl: CUBE_IMAGE, gradient: "from-amber-600/80 via-yellow-600/80 to-lime-500/80", borderColor: "border-amber-500/50", glowColor: "rgba(245,158,11,0.3)" },
  { imageUrl: CUBE_IMAGE, gradient: "from-zinc-700/80 via-slate-800/80 to-neutral-900/80", borderColor: "border-slate-400/50", glowColor: "rgba(148,163,184,0.3)" },
];

const FACE_TRANSFORMS = [
  "rotateY(0deg) translateZ(230px)",
  "rotateY(90deg) translateZ(230px)",
  "rotateY(180deg) translateZ(230px)",
  "rotateY(-90deg) translateZ(230px)",
  "rotateX(90deg) translateZ(230px)",
  "rotateX(-90deg) translateZ(230px)",
];

export default function BeatCube3D() {
  const [rotation, setRotation] = useState({ x: -18, y: 25 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const rotationStart = useRef({ x: -18, y: 25 });
  const autoRotateRef = useRef(true);

  useEffect(() => {
    let frameId: number;
    const loop = () => {
      if (autoRotateRef.current && !isDragging) {
        setRotation((prev) => ({ x: prev.x, y: prev.y + 0.35 }));
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [isDragging]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    autoRotateRef.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    rotationStart.current = rotation;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setRotation({
      x: rotationStart.current.x - dy * 0.4,
      y: rotationStart.current.y + dx * 0.4,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
    setTimeout(() => {
      autoRotateRef.current = true;
    }, 2000);
  };

  return (
    <section className="relative overflow-hidden bg-slate-950 py-24 text-white">
      {/* Background Ambient Glow */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[450px] w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />

      <div className="mb-14 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-emerald-300 backdrop-blur-md">
          <ShieldCheck className="h-3.5 w-3.5" />
          Real Purchases, Real Producers
        </span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
          People Are Buying Right Now
        </h2>
        <p className="mt-3 text-base text-slate-400 sm:text-lg max-w-lg mx-auto">
          Every purchase is verified and secured — drag the cube to see proof.
        </p>
      </div>

      <div
        className="mx-auto flex justify-center py-8"
        style={{ perspective: "1800px" }}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`relative h-[460px] w-[460px] touch-none select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transition: isDragging ? "none" : "transform 0.1s linear",
          }}
        >
          {CUBE_FACES.map((face, i) => (
            <div
              key={i}
              className={`absolute left-0 top-0 flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border ${face.borderColor} bg-slate-900/90 p-4 backdrop-blur-xl shadow-2xl transition-all duration-300`}
              style={{
                transform: FACE_TRANSFORMS[i],
                backfaceVisibility: "hidden",
                boxShadow: `0 0 35px ${face.glowColor}`,
              }}
            >
              {/* Background Image (proof screenshot) — full image, no crop */}
              {face.imageUrl && (
                <img
                  src={face.imageUrl}
                  alt="Purchase proof"
                  className="absolute inset-0 -z-20 h-full w-full bg-black object-contain"
                  draggable={false}
                />
              )}

              {/* Subtle accent overlay */}
              <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${face.gradient} opacity-20`} />

              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-medium text-white/90 backdrop-blur-md">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" />
                  Verified
                </span>
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}