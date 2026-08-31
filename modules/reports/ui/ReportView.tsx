'use client';

/**
 * SCREEN — Report (the school's official TESDA reporting surface)
 *
 * Ported from the claude.ai/design project (87e4718b… · components/ReportView.jsx).
 * Two sections, both derived from the per-scholar T2MIS roster (b.scholars_list):
 *   1. EGACE outcomes — Enrolled · Graduate · Assessed · Certified · Employed
 *      funnel strip + per-batch table with a summed TOTAL row.
 *   2. Employment report — the mandatory post-training (~6-month) follow-up:
 *      each certified graduate's current employment status, occupation,
 *      employer and salary.
 * "Export to Excel" builds a real .xlsx (no library) in the TESDA T2MIS
 * terminal-report column order — the same shape that gets imported.
 *
 * Portfolio-scoped: every batch the signed-in user can reach. `multiSchool`
 * adds the School column / school count once batches span more than one tenant.
 */

import { useMemo, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { Toast, type ToastData } from '@/shared/ui/Toast';
import { EGACE_STAGES, EMPLOYMENT_STATUSES } from '@/shared/vocab';
import { TENANTS } from '@/shared/mocks/seed';
import type { Batch, Tenant } from '@/shared/types';
import { egaceVal, computeEgaceTotals, egaceRate } from '@/modules/reports/domain/egace';
import {
  selectEmploymentCohorts,
  selectCertifiedScholars,
  computeEmploymentTotals,
  employmentRate,
  empTone,
} from '@/modules/reports/domain/employment';
import { exportXlsx } from '@/modules/reports/ui/exportXlsx';
import { ReportToolbar } from '@/modules/reports/ui/ReportToolbar';
import { EgaceSummaryStrip } from '@/modules/reports/ui/EgaceSummaryStrip';
import { EgaceOutcomesTable } from '@/modules/reports/ui/EgaceOutcomesTable';
import { EmploymentSummaryTiles } from '@/modules/reports/ui/EmploymentSummaryTiles';
import { EmploymentCohortList } from '@/modules/reports/ui/EmploymentCohortList';
import { EmploymentReportTable } from '@/modules/reports/ui/EmploymentReportTable';

interface ReportViewProps {
  batches: Batch[];
  tenants?: Tenant[];
  /** Show School column + school count. Defaults to true when batches span >1 tenant. */
  multiSchool?: boolean;
}

const ES = EMPLOYMENT_STATUSES;
const stages = EGACE_STAGES;
const today = 'June 8, 2026';

/** Derived state for the Report screen: EGACE totals + employment roster/rollup. */
function useReportViewData(batches: Batch[], tenants: Tenant[], multiSchool: boolean | undefined) {
  const isMulti = multiSchool ?? new Set(batches.map((b) => b.tenantId)).size > 1;

  const tenantOf = (id: string): Tenant =>
    tenants.find((t) => t.id === id) ?? ({ code: '—', name: '—', region: '' } as Tenant);

  // Stable ordering: by school, then cohort id.
  const rows = useMemo(
    () =>
      batches.slice().sort((a, b) => {
        if (a.tenantId !== b.tenantId) return a.tenantId < b.tenantId ? -1 : 1;
        return a.id < b.id ? -1 : 1;
      }),
    [batches],
  );

  const totals = computeEgaceTotals(rows, stages);
  const rate = (v: number) => egaceRate(totals, v);

  const empCohorts = selectEmploymentCohorts(rows);
  const empScholars = selectCertifiedScholars(empCohorts);
  const empTotals = computeEmploymentTotals(empScholars, ES);
  const empRate = employmentRate(empTotals);

  return { isMulti, tenantOf, rows, totals, rate, empCohorts, empScholars, empTotals, empRate };
}

export function ReportView({ batches, tenants = TENANTS, multiSchool }: ReportViewProps) {
  const [active, setActive] = useState<'egace' | 'employment'>('egace');
  const [toast, setToast] = useState<ToastData | null>(null);

  const { isMulti, tenantOf, rows, totals, rate, empCohorts, empScholars, empTotals, empRate } = useReportViewData(
    batches,
    tenants,
    multiSchool,
  );

  if (!rows.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '64px 24px', textAlign: 'center' }}>
        <Icon name="certificate" size={40} style={{ opacity: 0.3, color: 'var(--color-text-muted)' }} />
        <div style={{ fontSize: 16, color: 'var(--color-text-secondary)' }}>No batches to report</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Import batches to build the TESDA report.</div>
      </div>
    );
  }

  return (
    <div className="report-view" style={{ marginTop: 18 }}>
      <ReportToolbar
        active={active}
        onActiveChange={setActive}
        isMulti={isMulti}
        schoolCount={tenants.length}
        rowCount={rows.length}
        today={today}
        onExport={() => exportXlsx(rows, tenantOf, setToast)}
      />

      {active === 'egace' ? (
        <>
          <EgaceSummaryStrip stages={stages} totals={totals} rate={rate} />
          <EgaceOutcomesTable rows={rows} stages={stages} isMulti={isMulti} tenantOf={tenantOf} totals={totals} rate={rate} today={today} egaceVal={egaceVal} />
        </>
      ) : (
        <>
          <EmploymentSummaryTiles empTotals={empTotals} empRate={empRate} />
          <EmploymentCohortList empCohorts={empCohorts} isMulti={isMulti} tenantOf={tenantOf} />
          <EmploymentReportTable empScholars={empScholars} isMulti={isMulti} tenantOf={tenantOf} empTone={empTone} />
        </>
      )}

      {toast && <Toast title={toast.title} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default ReportView;
