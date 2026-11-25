import { EmptyState } from '@/shared/ui/EmptyState';

export default function TrainerClassesPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="t-page-title">My classes</h1>
      </div>
      <EmptyState iconName="file-off" heading="This screen isn't available yet." />
    </div>
  );
}
