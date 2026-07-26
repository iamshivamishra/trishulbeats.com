export default function ProducerProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Avatar + name area */}
      <div className="flex items-center gap-5">
        <div className="h-24 w-24 rounded-full bg-muted animate-pulse shrink-0" />
        <div className="space-y-3 flex-1">
          <div className="h-7 w-48 rounded-lg bg-muted animate-pulse" />
          <div className="h-4 w-32 rounded-lg bg-muted animate-pulse" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2 text-center">
            <div className="h-8 w-16 rounded-lg bg-muted animate-pulse mx-auto" />
            <div className="h-3 w-12 rounded-lg bg-muted animate-pulse mx-auto" />
          </div>
        ))}
      </div>

      {/* Beat grid (6 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-square rounded-xl bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded-lg bg-muted animate-pulse" />
            <div className="h-3 w-1/2 rounded-lg bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
