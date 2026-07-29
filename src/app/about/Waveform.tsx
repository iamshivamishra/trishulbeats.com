"use client";

const BAR_COUNT = 28;

export function Waveform() {
  return (
    <div
      className="mx-auto flex h-14 w-full max-w-sm items-end justify-center gap-[3px] sm:h-16 sm:max-w-md"
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const duration = 1.1 + ((i * 37) % 5) * 0.15;
        const delay = (i % 7) * 0.09;
        return (
          <span
            key={i}
            className="waveform-bar w-1.5 rounded-full bg-gradient-to-t from-primary/30 to-primary sm:w-2"
            style={{
              animationDuration: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
      <style jsx>{`
        .waveform-bar {
          height: 18%;
          animation-name: waveform-pulse;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes waveform-pulse {
          0%,
          100% {
            height: 15%;
            opacity: 0.6;
          }
          50% {
            height: 100%;
            opacity: 1;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .waveform-bar {
            animation: none;
            height: 55%;
            opacity: 0.85;
          }
        }
      `}</style>
    </div>
  );
}