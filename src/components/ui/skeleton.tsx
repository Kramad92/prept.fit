import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-gray-200 dark:bg-slate-700", className)} />
  );
}

export function CardSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-slate-700" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-slate-700" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="mt-6 space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="h-4 w-64 rounded bg-gray-200 dark:bg-slate-700" />
        </div>
        <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>
      <div className="mt-6 h-10 w-full rounded-lg bg-gray-200 dark:bg-slate-700" />
      <ListSkeleton />
    </div>
  );
}
