import { Skeleton } from "~/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Skeleton className="h-9 w-32 rounded-lg" />
        <Skeleton className="h-10 w-24 rounded-lg" />
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        {/* Mobile dropdown skeleton */}
        <div className="md:hidden">
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        {/* Settings sidebar skeleton - desktop only */}
        <div className="hidden shrink-0 md:block md:w-48">
          <div className="flex gap-1 rounded-xl border bg-card/60 p-1 flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Content area skeleton */}
        <div className="min-w-0 flex-1 space-y-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24 rounded-lg" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
