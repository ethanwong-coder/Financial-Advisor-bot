/** Pulsing placeholder used for loading states. `animate-pulse` is neutralized
 * under prefers-reduced-motion by the global rule in globals.css. */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`}
      aria-hidden="true"
    />
  );
}

/** A card-shaped skeleton matching the dashboard's flag/account cards. */
export function SkeletonCard() {
  return (
    <div className="card">
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}
