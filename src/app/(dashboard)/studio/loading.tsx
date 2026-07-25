export default function StudioDashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Stats grid (4 cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>

      {/* Recent activity section */}
      <div className="space-y-4">
        <div className="h-6 w-40 rounded-lg bg-muted animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-4 h-14 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
