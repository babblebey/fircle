import { Skeleton } from "~/components/ui/skeleton";

export default function GalleryLoading() {
  return (
    <section className="w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        {/* Header skeleton */}
        <header className="space-y-1 mx-auto w-full max-w-2xl">
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-4 w-64 rounded-lg mt-2" />
        </header>

        {/* Gallery grid skeleton */}
        <section className="space-y-4" aria-hidden>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton
                key={`gallery-loading-${index}`}
                className="aspect-4/5 rounded-2xl border border-border/70"
              />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}
