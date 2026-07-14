import { Skeleton } from "~/components/ui/skeleton";

export default function MembersLoading() {
  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header skeleton */}
      <header className="mx-auto w-full max-w-2xl flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Skeleton className="h-9 w-48 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg mt-2" />
        </div>
        <Skeleton className="h-10 w-40 rounded-lg" />
      </header>

      {/* Filters and search skeleton */}
      <section className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-10 w-80 rounded-lg" />
        </div>

        {/* Grid skeleton */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={`member-skeleton-${index}`} className="rounded-3xl border bg-card p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Skeleton className="size-12 shrink-0 rounded-full border" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-28 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-full" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
