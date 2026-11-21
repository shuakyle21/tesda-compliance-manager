import { EmptyState } from '@/shared/ui/EmptyState';

export default function TrainerAttendancePage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="t-page-title">Mark attendance</h1>
      </div>
      <EmptyState iconName="file-off" heading="This screen isn't available yet." />
    </div>
  );
}
