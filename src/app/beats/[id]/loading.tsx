export default function BeatDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Hero area: cover image + title/producer */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="h-64 w-64 rounded-xl bg-muted animate-pulse shrink-0" />
        <div className="flex flex-col justify-end gap-3 flex-1">
          <div className="h-8 w-3/4 rounded-lg bg-muted animate-pulse" />
          <div className="h-5 w-1/3 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Waveform area */}
      <div className="h-24 w-full rounded-xl bg-muted animate-pulse" />

      {/* License pricing section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>

      {/* Related beats grid */}
      <div className="space-y-4">
        <div className="h-6 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-square rounded-xl bg-muted animate-pulse" />
              <div className="h-4 w-3/4 rounded-lg bg-muted animate-pulse" />
              <div className="h-3 w-1/2 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
