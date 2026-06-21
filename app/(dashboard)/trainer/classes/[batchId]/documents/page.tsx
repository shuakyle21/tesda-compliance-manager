type PageProps = {
  params: Promise<{
    batchId: string;
  }>;
};

export default async function TrainerDocumentsPage({ params }: PageProps) {
  const { batchId } = await params;

  return (
    <div>
      <div className="mb-6">
        <h1 className="t-page-title">Attach trainer document</h1>
        <p className="t-body mt-2">
          Route mapped from Figma Frame 10 - Trainer Document Upload for batch{' '}
          <span className="t-mono">{batchId}</span>.
        </p>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] shadow-[var(--shadow-sm)] p-4">
        <p className="t-body">
          Trainer document upload placeholder - visible document keys are
          tip_report, training_sched, attendance, progress_rpt, and trainer_qual.
        </p>
      </div>
    </div>
  );
}
