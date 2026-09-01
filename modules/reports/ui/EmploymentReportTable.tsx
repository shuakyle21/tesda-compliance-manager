'use client';

import { Icon } from '@/shared/ui/Icon';
import type { Tenant } from '@/shared/types';
import { EMPLOYMENT_STATUSES } from '@/shared/vocab';
import type { EmploymentScholar } from '@/modules/reports/domain/employment';

interface EmploymentReportTableProps {
  empScholars: EmploymentScholar[];
  isMulti: boolean;
  tenantOf: (id: string) => Tenant;
  empTone: (status: string, ES: typeof EMPLOYMENT_STATUSES) => string;
}

export function EmploymentReportTable({ empScholars, isMulti, tenantOf, empTone }: EmploymentReportTableProps) {
  const ES = EMPLOYMENT_STATUSES;

  return (
    <div className="egace-table-card surface">
      <div className="egace-table-head">
        <div>
          <h2 className="egace-table-title">Employment Report — post-training follow-up</h2>
          <span className="egace-table-sub">{empScholars.length} certified graduates · official TESDA employment status</span>
        </div>
      </div>
      {empScholars.length === 0 ? (
        <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
          No cohorts are due for employment follow-up yet — graduates appear here once certified.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="egace-table emp-table">
            <thead>
              <tr>
                <th className="egc-th egc-num">No.</th>
                {isMulti && <th className="egc-th">School</th>}
                <th className="egc-th">Scholar</th>
                <th className="egc-th">Sex</th>
                <th className="egc-th">Cohort · Qualification</th>
                <th className="egc-th">Employment status</th>
                <th className="egc-th">Occupation / Employer</th>
                <th className="egc-th egc-num">Salary (₱)</th>
              </tr>
            </thead>
            <tbody>
              {empScholars.map((r, i) => {
                const tone = empTone(r.s.employmentStatus, ES);
                const employed = r.s.employmentStatus === ES.wage || r.s.employmentStatus === ES.self;
                return (
                  <tr key={r.batch.id + '-' + i} className={i % 2 === 0 ? 'egc-row-odd' : ''}>
                    <td className="egc-td egc-num egc-batchno">{i + 1}</td>
                    {isMulti && <td className="egc-td egc-mono">{tenantOf(r.batch.tenantId).code}</td>}
                    <td className="egc-td">
                      <div className="egc-qual">
                        {r.s.lastName}, {r.s.firstName} {r.s.middleInit}
                      </div>
                      <div className="egc-meta">{r.s.uli}</div>
                    </td>
                    <td className="egc-td egc-mono">{r.s.sex.slice(0, 1)}</td>
                    <td className="egc-td">
                      <div style={{ fontSize: 11.5 }}>{r.batch.id}</div>
                      <div className="egc-meta">{r.batch.qualification}</div>
                    </td>
                    <td className="egc-td">
                      <span
                        className="emp-badge"
                        style={{
                          background: tone === 'neutral' ? 'var(--color-surface-alt)' : `var(--color-${tone}-lt)`,
                          color: tone === 'neutral' ? 'var(--color-text-secondary)' : `var(--color-${tone}-dk)`,
                          borderColor: tone === 'neutral' ? 'var(--color-border)' : `var(--color-${tone})`,
                        }}
                      >
                        {r.s.employmentStatus || '—'}
                      </span>
                    </td>
                    <td className="egc-td">
                      {employed ? (
                        <span>
                          <span style={{ fontSize: 11.5 }}>{r.s.occupation}</span>
                          <span className="egc-meta" style={{ display: 'block' }}>
                            {r.s.employer}
                          </span>
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-text-disabled)' }}>—</span>
                      )}
                    </td>
                    <td className="egc-td egc-num egc-mono">{r.s.salary ? Number(r.s.salary).toLocaleString() : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div className="egace-footnote">
        <Icon name="info-circle" size={12} />
        <span>
          Schools must file each certified graduate&apos;s current employment status with TESDA — mandatory by the 6-month mark, though it may be reported earlier. Updates here flow straight into the EGACE “Employed” figure, the dashboard, and the Excel export.
        </span>
      </div>
    </div>
  );
}

export default EmploymentReportTable;
