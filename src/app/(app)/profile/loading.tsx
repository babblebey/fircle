import { Skeleton } from "~/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <section className="px-4 py-8 sm:px-6">
      {/* Header skeleton */}
      <div className="space-y-4 text-center">
        <Skeleton className="h-32 w-32 rounded-full mx-auto" />
        <div className="space-y-2 mx-auto max-w-sm">
          <Skeleton className="h-6 w-40 rounded-lg mx-auto" />
          <Skeleton className="h-4 w-48 rounded-lg mx-auto" />
        </div>
      </div>

      {/* Edit button skeleton */}
      <div className="flex justify-center mt-4">
        <Skeleton className="h-10 w-40 rounded-lg" />
      </div>

      {/* Tabs skeleton */}
      <section className="mt-6">
        <div className="flex w-full max-w-2xl mx-auto border-b gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-t-lg" />
          ))}
        </div>

        {/* Posts list skeleton */}
        <div className="space-y-4 mx-auto max-w-2xl pt-4" aria-hidden>
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border bg-card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32 rounded-lg" />
                  <Skeleton className="h-3 w-20 rounded-lg" />
                </div>
              </div>
              <Skeleton className="h-3 w-full rounded-lg" />
              <Skeleton className="aspect-video rounded-lg" />
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
