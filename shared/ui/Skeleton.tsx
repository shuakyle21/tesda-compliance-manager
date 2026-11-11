export function SkeletonBlock({ h, w }: { h: number; w?: number | string }) {
  return <div className="skeleton" aria-hidden="true" style={{ height: h, width: w }} />;
}

export function PageSkeleton({ label }: { label: string }) {
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">{label}</span>
      <div className="page-head" aria-hidden="true">
        <SkeletonBlock h={28} w={220} />
        <SkeletonBlock h={14} w={320} />
      </div>
      <div style={{ display: 'grid', gap: 16 }} aria-hidden="true">
        <SkeletonBlock h={36} />
        <SkeletonBlock h={420} />
      </div>
    </div>
  );
}
