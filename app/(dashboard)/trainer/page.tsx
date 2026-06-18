export default function TrainerDashboardPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="t-page-title">Teaching dashboard</h1>
        <p className="t-body mt-2">
          Route mapped from Figma Frame 7 - Trainer Dashboard. This route is
          trainer-only and must show assigned classes, attendance, progress, and
          training-side tasks only.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
        <p className="t-body">
          Trainer dashboard placeholder - API must hide billing deadline, BSRS,
          NTP lag, billing preparation, and financial document fields.
        </p>
      </div>
    </div>
  );
}
