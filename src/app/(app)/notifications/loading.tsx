import { Skeleton } from "~/components/ui/skeleton";

export default function NotificationsLoading() {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-20 rounded-full" />
        ))}
      </div>

      {/* Notifications list skeleton */}
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: 6 }).map((_, index) => (
          <article
            key={`notification-skeleton-${index}`}
            className="flex items-start gap-4 rounded-2xl border bg-card px-4 py-3.5"
          >
            <Skeleton className="mt-0.5 size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-10/12 rounded-full" />
              <Skeleton className="h-3 w-8/12 rounded-full" />
              <Skeleton className="h-2.5 w-20 rounded-full" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
