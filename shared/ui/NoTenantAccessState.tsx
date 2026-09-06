/**
 * UI COMPONENT — NoTenantAccessState
 *
 * The sixth data-screen state (RULES.md rule 24), and the one that was
 * missing: the caller belongs to no school, so every RLS-scoped read comes
 * back empty. Without it, every screen renders its ordinary empty state and
 * tells the user something false — "no assigned batches", "no activity yet" —
 * about data they were never able to see in the first place.
 *
 * Props-only and presentational, per the `shared/ui` contract. The copy lives
 * here rather than at each call site so all eight screens say the same thing:
 * a compliance tool that explains the same situation eight slightly different
 * ways teaches its users to distrust it.
 */

import { EmptyState } from './EmptyState';

interface NoTenantAccessStateProps {
  /** What the caller was trying to see, lowercase — e.g. "batches", "the activity log". */
  subject?: string;
}

export function NoTenantAccessState({ subject = 'this workspace' }: NoTenantAccessStateProps) {
  return (
    <EmptyState
      iconName="users"
      heading="No school assigned yet"
      sub={`Your account isn't attached to a school, so ${subject} can't be shown. An admin or registrar assigns your school and role — once they do, this page fills in on its own.`}
    />
  );
}

export default NoTenantAccessState;
