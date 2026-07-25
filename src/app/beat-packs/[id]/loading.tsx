export default function BeatPackDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Pack cover + title area */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="h-56 w-56 rounded-xl bg-muted animate-pulse shrink-0" />
        <div className="flex flex-col justify-end gap-3 flex-1">
          <div className="h-8 w-2/3 rounded-lg bg-muted animate-pulse" />
          <div className="h-5 w-1/3 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-1/2 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Track list (5 rows) */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 h-14 rounded-lg bg-muted animate-pulse"
          />
        ))}
      </div>

      {/* Pricing section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    </div>
  );
}
