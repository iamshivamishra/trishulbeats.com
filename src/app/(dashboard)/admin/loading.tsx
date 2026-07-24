import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="page-shell">
      {/* Header */}
      <div className="mb-8">
        <Skeleton className="mb-2 h-9 w-52" />
        <Skeleton className="h-5 w-64" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/80 p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-4 rounded" />
            </div>
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </div>

      {/* Shortcuts panel */}
      <div className="mt-8 rounded-2xl border border-border/50 bg-card/70 p-5 shadow-sm">
        <Skeleton className="mb-1 h-4 w-32" />
        <Skeleton className="mb-4 h-4 w-72" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-9 w-32 rounded-md" />
          <Skeleton className="h-9 w-36 rounded-md" />
          <Skeleton className="h-9 w-48 rounded-md" />
        </div>
      </div>
    </div>
  );
}
