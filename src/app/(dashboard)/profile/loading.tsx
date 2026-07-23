import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="page-shell max-w-4xl">
      {/* Avatar card */}
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm sm:flex-row">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2 text-center sm:text-left">
          <Skeleton className="mx-auto h-7 w-48 sm:mx-0" />
          <Skeleton className="mx-auto h-4 w-28 sm:mx-0" />
          <Skeleton className="mx-auto h-4 w-40 sm:mx-0" />
          <Skeleton className="mx-auto mt-2 h-5 w-16 rounded-full sm:mx-0" />
        </div>
        <div className="flex shrink-0 gap-2">
          <Skeleton className="h-8 w-28 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      <Skeleton className="my-8 h-px w-full" />

      {/* Beat Packs section */}
      <div className="mb-8 rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm">
        <Skeleton className="mb-4 h-6 w-32" />
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-background p-3"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16 rounded-full" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-24 rounded-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Purchase history */}
      <div className="rounded-2xl border border-border/50 bg-card/80 p-5 shadow-sm">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border border-border/30 bg-background p-3"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-16 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </div>
              <div className="space-y-1 text-right">
                <Skeleton className="ml-auto h-4 w-12" />
                <Skeleton className="ml-auto h-6 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
