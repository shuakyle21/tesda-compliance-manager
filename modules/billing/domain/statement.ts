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
import { formatDate } from '@/shared/dates';
import {
  ACCIDENT_INSURANCE,
  ENTREPRENEURSHIP_FEE,
  NEW_NORMAL_ASSISTANCE,
  RATE_UNAVAILABLE,
  TSF_DAY_RATE,
  nominalHoursFor,
  trainingCostFor,
  pesoLabel,
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
  school: string;
  region: string;
  /** Uppercase program banner, e.g. "COCONUT FARMERS SCHOLARSHIP PROGRAM (CFSP)". */
  programLine: string;
  docTitle: string;
  subtitle: string;
  qualification: string;
  trainerName: string;
  rqm: string | null;
  period: string;
  scholarsLabel: string;
  columns: StatementColumn[];
  /** One entry per scholar; `cells` aligns positionally to `columns`. */
  rows: { cells: string[] }[];
  summary: StatementSummaryLine[];
  totalLabel: string;
  /** `null` when no component of the document has a rate (shown as "—"). */
  grandTotal: number | null;
  grandTotalLabel: string;
  grandWords: string;
}

/** Minimal school context the statement header needs (from the tenant record). */
export interface StatementTenant {
  name: string;
  region: string;
}

// --- formatting helpers ----------------------------------------------------

/**
 * Formats a number as a peso amount with two decimal places (e.g., 15390 → "₱15,390.00").
 */
export function formatPeso(n: number): string {
  return '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Formats a scholar's name for the billing statement roster: "DELA CRUZ, Juan P."
 * (uppercase last name, first name as provided, middle initial when present).
 */
function scholarName(s: ScholarRow): string {
  const mi = s.middleInit ? ` ${s.middleInit.trim()}` : '';
  return `${s.lastName.toUpperCase()}, ${s.firstName}${mi}`.trim();
}

/**
 * Formats the training period for the statement header (e.g., "Apr 21 – Jun 8, 2026 (360 hrs)").
 */
function trainingPeriod(batch: Batch): string {
  const hrs = nominalHoursFor(batch.qualification);
  return `${formatDate(batch.trainingStart) ?? '—'} – ${formatDate(batch.trainingEnd) ?? '—'} (${hrs ?? '—'} hrs)`;
}

/**
 * Returns the full program banner for the statement cover (CFSP or TWSP).
 */
function programBanner(program: string): string {
  if (!program.trim()) return '—';
  return isCfsp(program)
    ? 'Coconut Farmers Scholarship Program (CFSP)'
    : 'Training for Work Scholarship Program (TWSP)';
}

// --- builder ---------------------------------------------------------------

/**
 * Build a complete billing statement for a batch and track combination.
 *
 * Generates all components: header info, column definitions, per-scholar rows,
 * summary lines, and grand total with amount-in-words. Falls back to an empty
 * roster gracefully (the modal shows a zero-row table) when a batch has no
 * `scholars_list` yet.
 *
 * @param batch - The batch to bill
 * @param trackId - The billing track (training_cost, tsf_allowance, or entrepreneurship)
 * @param tenant - The school context for the statement header
 * @returns Complete billing statement ready for preview or generation
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
    school: tenant.name,
    region: tenant.region,
    programLine: programBanner(batch.program).toUpperCase(),
    docTitle,
    qualification: batch.qualification,
    trainerName: batch.trainer || '—',
    rqm: batch.rqmCode,
    period: trainingPeriod(batch),
    scholarsLabel: batch.scholars_list ? `${roster.length} pax` : '—',
  };

  if (trackId === 'training_cost') return buildTrainingCost(batch, roster, header);
  if (trackId === 'tsf_allowance') return buildTsfAllowance(batch, roster, header);
  return buildEntrepreneurship(batch, roster, header);
}

type Header = Omit<
  BillingStatement,
  'subtitle' | 'columns' | 'rows' | 'summary' | 'totalLabel' | 'grandTotal' | 'grandTotalLabel' | 'grandWords'
>;

/**
 * Finalizes a billing statement by combining the header with the computed
 * columns, rows, summary, and grand total. Adds the amount-in-words footer.
 */
function finalize(
  header: Header,
  subtitle: string,
  columns: StatementColumn[],
  rows: { cells: string[] }[],
  summary: StatementSummaryLine[],
  grandTotal: number | null,
): BillingStatement {
  return {
    ...header,
    subtitle,
    columns,
    rows,
    summary,
    totalLabel: 'Total amount due',
    grandTotal,
    grandTotalLabel: grandTotal === null ? '—' : formatPeso(grandTotal),
    grandWords: grandTotal === null ? '—' : pesosInWords(grandTotal),
  };
}

/**
 * Builds the Training Cost statement (flat per-scholar cost).
 * Matches the source docx exactly.
 */
function buildTrainingCost(batch: Batch, roster: ScholarRow[], header: Header): BillingStatement {
  const unit = trainingCostFor(batch.qualification);
  const columns: StatementColumn[] = [
    { key: 'no', label: 'No.', align: 'left', mono: true },
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'sex', label: 'Sex', align: 'center' },
    { key: 'cost', label: 'Training Cost', align: 'right', mono: true },
    { key: 'total', label: 'Total Cost', align: 'right', mono: true },
  ];
  const cost = unit === null ? '—' : formatPeso(unit);
  const rows = roster.map((s, i) => ({
    cells: [String(i + 1), scholarName(s), s.sex || '—', cost, cost],
  }));
  if (unit === null) {
    // Unmapped qualification: no rate, so no amount — never a guessed default.
    const summary = [{ label: RATE_UNAVAILABLE, amount: '—' }];
    return finalize(header, `${RATE_UNAVAILABLE} · ${header.scholarsLabel}`, columns, rows, summary, null);
  }
  const grandTotal = unit * roster.length;
  const summary: StatementSummaryLine[] = [
    { label: `${roster.length} scholars × ${formatPeso(unit)}`, amount: formatPeso(grandTotal) },
  ];
  return finalize(header, `${formatPeso(unit)} per scholar · ${header.scholarsLabel}`, columns, rows, summary, grandTotal);
}

/**
 * Builds the TSF / Allowance statement. Includes TSF days plus (CFSP only)
 * New Normal Assistance and Accident Insurance per scholar.
 */
function buildTsfAllowance(batch: Batch, roster: ScholarRow[], header: Header): BillingStatement {
  const cfsp = isCfsp(batch.program);
  const days = tsfDaysFor(batch.qualification);
  const tsf = days === null ? null : days * TSF_DAY_RATE;
  const perScholar = (tsf ?? 0) + (cfsp ? NEW_NORMAL_ASSISTANCE + ACCIDENT_INSURANCE : 0);
  // Without a TSF rate, only CFSP's fixed components can be summed; TWSP has nothing to total.
  const hasAmount = tsf !== null || cfsp;

  const columns: StatementColumn[] = [
    { key: 'no', label: 'No.', align: 'left', mono: true },
    { key: 'name', label: 'Name', align: 'left' },
    { key: 'sex', label: 'Sex', align: 'center' },
    { key: 'tsf', label: `TSF (${days ?? '—'}×${pesoLabel(TSF_DAY_RATE)})`, align: 'right', mono: true },
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
      tsf === null ? '—' : formatPeso(tsf),
      ...(cfsp ? [formatPeso(NEW_NORMAL_ASSISTANCE), formatPeso(ACCIDENT_INSURANCE)] : []),
      hasAmount ? formatPeso(perScholar) : '—',
    ],
  }));

  const n = roster.length;
  const grandTotal = hasAmount ? perScholar * n : null;
  const summary: StatementSummaryLine[] = [
    tsf === null
      ? { label: `TSF — ${RATE_UNAVAILABLE}`, amount: '—' }
      : { label: `TSF — ${days} days × ${pesoLabel(TSF_DAY_RATE)} × ${n}`, amount: formatPeso(tsf * n) },
    ...(cfsp
      ? [
          { label: `New Normal Assistance — ${pesoLabel(NEW_NORMAL_ASSISTANCE)} × ${n}`, amount: formatPeso(NEW_NORMAL_ASSISTANCE * n) },
          { label: `Accident Insurance — ${pesoLabel(ACCIDENT_INSURANCE)} × ${n}`, amount: formatPeso(ACCIDENT_INSURANCE * n) },
        ]
      : []),
    ...(tsf === null && cfsp ? [{ label: 'Total excludes TSF (no rate for this qualification)', amount: '—' }] : []),
  ];
  const subtitle = hasAmount ? `${formatPeso(perScholar)} per scholar` : RATE_UNAVAILABLE;
  return finalize(header, `${subtitle} · ${header.scholarsLabel}`, columns, rows, summary, grandTotal);
}

/**
 * Builds the Entrepreneurship statement. ₱800 per scholar, CFSP only
 * (single payment on delivery).
 */
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
    { label: `${pesoLabel(ENTREPRENEURSHIP_FEE)} × ${roster.length} scholars`, amount: formatPeso(grandTotal) },
  ];
  return finalize(header, `${pesoLabel(ENTREPRENEURSHIP_FEE)} per scholar · ${header.scholarsLabel}`, columns, rows, summary, grandTotal);
}
