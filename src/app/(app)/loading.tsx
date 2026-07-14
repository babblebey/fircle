import { Skeleton } from "~/components/ui/skeleton";

export default function AppRouteLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6 lg:px-8" aria-live="polite" aria-busy="true">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44 rounded-full" />
        <Skeleton className="h-4 w-64 rounded-full" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <section key={index} className="rounded-3xl border border-border/80 bg-card/90 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28 rounded-full" />
                <Skeleton className="h-3 w-16 rounded-full" />
              </div>
            </div>
            <Skeleton className="mt-4 h-3.5 w-11/12 rounded-full" />
            <Skeleton className="mt-2 h-3.5 w-9/12 rounded-full" />
            <Skeleton className="mt-4 aspect-video rounded-2xl" />
          </section>
        ))}
      </div>
    </div>
  );
}
