'use client';

import { Icon } from '@/shared/ui/Icon';
import type { Batch, Tenant } from '@/shared/types';

interface EmploymentCohortListProps {
  empCohorts: Batch[];
  isMulti: boolean;
  tenantOf: (id: string) => Tenant;
}

export function EmploymentCohortList({ empCohorts, isMulti, tenantOf }: EmploymentCohortListProps) {
  if (empCohorts.length === 0) return null;

  return (
    <div className="emp-cohorts">
      {empCohorts.map((b) => {
        const f = b.employmentFollowUp!;
        return (
          <div key={b.id} className="emp-cohort">
            <Icon name="clock" size={13} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            <span className="emp-cohort-name">
              {isMulti ? tenantOf(b.tenantId).code + ' · ' : ''}
              {b.id} {b.qualification}
            </span>
            <span className="emp-cohort-meta">
              6-month follow-up due <strong>{f.due || '—'}</strong> · {f.employed}/{f.certified} employed · {f.awaiting} pending
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default EmploymentCohortList;
