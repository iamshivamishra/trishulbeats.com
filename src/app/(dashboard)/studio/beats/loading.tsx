import { Skeleton } from "@/components/ui/skeleton";

export default function StudioBeatsLoading() {
  return (
    <div className="page-shell">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-56" />
      </div>

      {/* Stats row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border/50 bg-card/80 p-4 shadow-sm"
          >
            <Skeleton className="mb-2 h-3 w-20" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 bg-card/80 shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border/40 px-4 py-3">
          <Skeleton className="h-4 w-[30%]" />
          <Skeleton className="h-4 w-[15%]" />
          <Skeleton className="h-4 w-[12%]" />
          <Skeleton className="h-4 w-[12%]" />
          <Skeleton className="h-4 w-[10%]" />
          <Skeleton className="h-4 w-[10%]" />
        </div>
        {/* Rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border/20 px-4 py-3 last:border-0"
          >
            <div className="flex w-[30%] items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-md" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <Skeleton className="h-4 w-[15%]" />
            <Skeleton className="h-4 w-[12%]" />
            <Skeleton className="h-4 w-[12%]" />
            <Skeleton className="h-5 w-[10%] rounded-full" />
            <Skeleton className="h-8 w-[10%] rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
