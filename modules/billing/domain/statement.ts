/**
 * Billing statement builder (FR-09, ADR-001 §V2/§W1) — pure, no I/O.
 *
 * Turns a batch + a chosen track into the fully-computed statement the preview
 * modal renders: per-scholar rows, per-component summary, grand total, and the
 * cover amount-in-words. Deterministic and unit-testable — feed it a fixed batch
 * fixture and the totals are fixed (e.g. ₱15,390 × 17 = ₱261,630.00).
 *
 * Scope note (ADR-002): this portrays a *single* generated document. The
 * append-only `billing_records` generation log and the 20/50/80 tranche ladder
 * are ADR-001 features the modal does not show, so they are deliberately out of
 * scope here.
 */

import type { Batch, ScholarRow } from '@/shared/types';
import type { BillingTrackId } from './tracks';
import { isCfsp, trackById } from './tracks';
import { pesosInWords } from './amountInWords';
import {
  ACCIDENT_INSURANCE,
  ENTREPRENEURSHIP_FEE,
  NEW_NORMAL_ASSISTANCE,
  TSF_DAY_RATE,
  nominalHoursFor,
  trainingCostFor,
  tsfDaysFor,
} from './rates';

export interface StatementColumn {
  key: string;
  label: string;
  align: 'left' | 'center' | 'right';
  /** Numeric columns render in the mono face. */
  mono?: boolean;
}

export interface StatementSummaryLine {
  label: string;
  amount: string;
}

export interface BillingStatement {
  trackId: BillingTrackId;
  trackLabel: string;
  batchId: string;
  school: string;
  region: string;
  /** Uppercase program banner, e.g. "COCONUT FARMERS SCHOLARSHIP PROGRAM (CFSP)". */
  programLine: string;
  docTitle: string;
  subtitle: string;
  qualification: string;
  trainerName: string;
  rqm: string;
  period: string;
  scholarsLabel: string;
  columns: StatementColumn[];
  /** One entry per scholar; `cells` aligns positionally to `columns`. */
  rows: { cells: string[] }[];
  summary: StatementSummaryLine[];
  totalLabel: string;
  grandTotal: number;
  grandTotalLabel: string;
  grandWords: string;
}

/** Minimal school context the statement header needs (from the tenant record). */
export interface StatementTenant {
  name: string;
  region: string;
}

// --- formatting helpers ----------------------------------------------------

/** 15390 → "₱15,390.00". */
export function formatPeso(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** ScholarRow → "DELA CRUZ, Juan P." (uppercase last, title-ish first). */
function scholarName(s: ScholarRow): string {
  const mi = s.middleInit ? ` ${s.middleInit.trim()}` : '';
  return `${s.lastName.toUpperCase()}, ${s.firstName}${mi}`.trim();
}

/**
 * Synthesized RQM code (ADR-001 structure `RQM<tranche>-<year>-<program>-<institution>-<seq>`).
 * Deterministic from the batch code so the same batch always shows the same
 * authorization; clearly a prototype value until `rqm_code` is on the contract.
 */
function rqmCode(batch: Batch): string {
  const seq = (batch.id.match(/\d+/)?.[0] ?? '0').padStart(4, '0');
  const program = batch.program.trim().toUpperCase() || 'CFSP';
  return `RQM3-2026-${program}-1263-${seq}`;
}

/** "Apr 21 – Jun 8, 2026 (360 hrs)". */
function trainingPeriod(batch: Batch): string {
  const hrs = nominalHoursFor(batch.qualification);
  return `${batch.trainingStart} – ${batch.trainingEnd} (${hrs} hrs)`;
}

function programBanner(program: string): string {
  return isCfsp(program)
    ? 'Coconut Farmers Scholarship Program (CFSP)'
    : 'Training for Work Scholarship Program (TWSP)';
}

// --- builder ---------------------------------------------------------------

/**
 * Build the statement for a batch + track. Falls back to an empty roster
 * gracefully (the modal shows a zero-row table, never a crash) when a batch has
 * no `scholars_list` yet.
 */
export function buildStatement(
  batch: Batch,
  trackId: BillingTrackId,
  tenant: StatementTenant,
): BillingStatement {
  const track = trackById(trackId);
  const roster = batch.scholars_list ?? [];

  // TSF's cover title is program-aware: TWSP has no New Normal component, so it
  // must not claim one (copy accuracy — this is a compliance document).
  const docTitle =
    trackId === 'tsf_allowance' && !isCfsp(batch.program)
      ? 'Training Support Fund (TSF)'
      : track.docTitle;

  const header = {
    trackId,
    trackLabel: track.label,
    batchId: batch.id,
    school: tenant.name,
    region: tenant.region,
    programLine: programBanner(batch.program).toUpperCase(),
    docTitle,
    qualification: batch.qualification,
    trainerName: batch.trainer || '—',
    rqm: rqmCode(batch),
    period: trainingPeriod(batch),
    scholarsLabel: `${roster.length} pax`,
  };

  if (trackId === 'training_cost') return buildTrainingCost(batch, roster, header);
  if (trackId === 'tsf_allowance') return buildTsfAllowance(batch, roster, header);
  return buildEntrepreneurship(batch, roster, header);
}

type Header = Omit<
  BillingStatement,
  'subtitle' | 'columns' | 'rows' | 'summary' | 'totalLabel' | 'grandTotal' | 'grandTotalLabel' | 'grandWords'
>;

function finalize(
  header: Header,
  subtitle: string,
  columns: StatementColumn[],
  rows: { cells: string[] }[],
  summary: StatementSummaryLine[],
  grandTotal: number,
): BillingStatement {
  return {
    ...header,
    subtitle,
    columns,
    rows,
    summary,
    totalLabel: 'Total amount due',
    grandTotal,
    grandTotalLabel: formatPeso(grandTotal),
    grandWords: pesosInWords(grandTotal),
  };
}

// Training Cost — flat per-scholar cost (matches the source docx exactly).
function buildTrainingCost(batch: Batch, roster: ScholarRow[], header: Header): BillingStatement {
  const unit = trainingCostFor(batch.qualification);
  const columns: StatementColumn[] = [
    { key: 'no', label: 'No.', align: 'left', mono: true },
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'sex', label: 'Sex', align: 'center' },
    { key: 'cost', label: 'Training Cost', align: 'right', mono: true },
    { key: 'total', label: 'Total Cost', align: 'right', mono: true },
  ];
  const rows = roster.map((s, i) => ({
    cells: [String(i + 1), scholarName(s), s.sex || '—', formatPeso(unit), formatPeso(unit)],
  }));
  const grandTotal = unit * roster.length;
  const summary: StatementSummaryLine[] = [
    { label: `${roster.length} scholars × ${formatPeso(unit)}`, amount: formatPeso(grandTotal) },
  ];
  return finalize(header, `${formatPeso(unit)} per scholar · ${roster.length} pax`, columns, rows, summary, grandTotal);
}

// TSF / Allowance — TSF days + (CFSP) New Normal + Insurance per scholar.
function buildTsfAllowance(batch: Batch, roster: ScholarRow[], header: Header): BillingStatement {
  const cfsp = isCfsp(batch.program);
  const days = tsfDaysFor(batch.qualification);
  const tsf = days * TSF_DAY_RATE;
  const perScholar = tsf + (cfsp ? NEW_NORMAL_ASSISTANCE + ACCIDENT_INSURANCE : 0);

  const columns: StatementColumn[] = [
    { key: 'no', label: 'No.', align: 'left', mono: true },
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'sex', label: 'Sex', align: 'center' },
    { key: 'tsf', label: `TSF (${days}×₱160)`, align: 'right', mono: true },
    ...(cfsp
      ? [
          { key: 'nn', label: 'New Normal', align: 'right' as const, mono: true },
          { key: 'ins', label: 'Insurance', align: 'right' as const, mono: true },
        ]
      : []),
    { key: 'total', label: 'Total', align: 'right', mono: true },
  ];

  const rows = roster.map((s, i) => ({
    cells: [
      String(i + 1),
      scholarName(s),
      s.sex || '—',
      formatPeso(tsf),
      ...(cfsp ? [formatPeso(NEW_NORMAL_ASSISTANCE), formatPeso(ACCIDENT_INSURANCE)] : []),
      formatPeso(perScholar),
    ],
  }));

  const n = roster.length;
  const grandTotal = perScholar * n;
  const summary: StatementSummaryLine[] = [
    { label: `TSF — ${days} days × ₱160 × ${n}`, amount: formatPeso(tsf * n) },
    ...(cfsp
      ? [
          { label: `New Normal Assistance — ₱1,000 × ${n}`, amount: formatPeso(NEW_NORMAL_ASSISTANCE * n) },
          { label: `Accident Insurance — ₱100.80 × ${n}`, amount: formatPeso(ACCIDENT_INSURANCE * n) },
        ]
      : []),
  ];
  return finalize(header, `${formatPeso(perScholar)} per scholar · ${n} pax`, columns, rows, summary, grandTotal);
}

// Entrepreneurship — ₱800 per scholar, CFSP only (single payment on delivery).
function buildEntrepreneurship(batch: Batch, roster: ScholarRow[], header: Header): BillingStatement {
  const columns: StatementColumn[] = [
    { key: 'no', label: 'No.', align: 'left', mono: true },
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'sex', label: 'Sex', align: 'center' },
    { key: 'fee', label: 'Entrepreneurship Fee', align: 'right', mono: true },
    { key: 'total', label: 'Total', align: 'right', mono: true },
  ];
  const rows = roster.map((s, i) => ({
    cells: [
      String(i + 1),
      scholarName(s),
      s.sex || '—',
      formatPeso(ENTREPRENEURSHIP_FEE),
      formatPeso(ENTREPRENEURSHIP_FEE),
    ],
  }));
  const grandTotal = ENTREPRENEURSHIP_FEE * roster.length;
  const summary: StatementSummaryLine[] = [
    { label: `₱800 × ${roster.length} scholars`, amount: formatPeso(grandTotal) },
  ];
  return finalize(header, `₱800 per scholar · ${roster.length} pax`, columns, rows, summary, grandTotal);
}
