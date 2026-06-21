type PageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

export default async function TrainerAttendancePage({ params }: PageProps) {
  const { batchId } = await params;

  return (
    <div>
      <div className="mb-6">
        <h1 className="t-page-title">Mark attendance</h1>
        <p className="t-body mt-2">
          Route mapped from Figma Frame 9 - Trainer Attendance Flow for batch{' '}
          <span className="t-mono">{batchId}</span>.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
        <p className="t-body">
          Attendance placeholder - Laravel must verify the trainer is assigned
          to this batch before returning roster data or accepting writes.
        </p>
      </div>
    </div>
  );
}
