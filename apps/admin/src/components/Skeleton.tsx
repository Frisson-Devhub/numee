type SkeletonProps = {
  className?: string;
  /** `onPanel` uses muted auth-on-panel fills for the charcoal sidebar. */
  tone?: "default" | "onPanel";
};

/** Neutral pulse block for admin loading placeholders. */
export function Skeleton({ className = "", tone = "default" }: SkeletonProps) {
  const fill =
    tone === "onPanel" ? "bg-auth-on-panel/15" : "bg-gray-200/80";
  return (
    <div
      className={`animate-pulse rounded-md ${fill} ${className}`}
      aria-hidden
    />
  );
}

/** Main-content placeholder while the admin session check (or shell) is resolving. */
export function AdminContentSkeleton() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-6"
      role="status"
      aria-label="Loading content"
    >
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
      <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[92%]" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-4 h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
      </div>
    </div>
  );
}
