/* ── Skeleton Loading Components ─────────────────────────────────────────── */

export function SkeletonLine({
  height = "h-4",
  width = "w-full",
  className = "",
}: {
  height?: string;
  width?: string;
  className?: string;
}) {
  return <div className={`${height} ${width} rounded-md shimmer-dark ${className}`} />;
}

export function SkeletonCircle({
  size = "w-10 h-10",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return <div className={`${size} rounded-full shimmer-dark ${className}`} />;
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-slate-800 border border-slate-700/50 rounded-xl p-6 space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonCircle size="w-10 h-10" />
        <div className="flex-1 space-y-2">
          <SkeletonLine width="w-1/3" />
          <SkeletonLine width="w-1/2" height="h-3" />
        </div>
      </div>
      <SkeletonLine />
      <SkeletonLine width="w-3/4" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-slate-700/50">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={`h-${i}`} width={i === 0 ? "w-1/4" : "w-1/6"} height="h-3" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex items-center gap-4 py-3">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <SkeletonLine
              key={`${rowIdx}-${colIdx}`}
              width={colIdx === 0 ? "w-1/4" : "w-1/6"}
              height="h-4"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-slate-800 border border-slate-700/50 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <SkeletonLine width="w-20" height="h-3" />
            <SkeletonCircle size="w-8 h-8" />
          </div>
          <SkeletonLine width="w-16" height="h-8" />
          <SkeletonLine width="w-24" height="h-3" />
        </div>
      ))}
    </div>
  );
}
