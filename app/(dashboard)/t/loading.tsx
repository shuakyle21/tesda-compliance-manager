import { PageSkeleton } from '@/shared/ui/Skeleton';

// Sits ABOVE [tenantCode]/layout.tsx on purpose: a loading file does not cover its own
// folder's layout, and that layout awaits the school scope. This shows during a school switch.
export default function Loading() {
  return <PageSkeleton label="Loading school" />;
}
