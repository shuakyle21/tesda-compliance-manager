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
  ROSTER_NOT_LOADED,
  TSF_DAY_RATE,
  nominalHoursFor,
  trainingCostFor,
  pesoLabel,
  tsfDaysForBatch,
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
  /** Why `grandTotal` is "—" (e.g. missing rate, roster not loaded); `null` when the total is complete. */
  unavailableReason: string | null;
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
 * Formats the training period for the statement header (e.g., "Apr 21 – Jun 8, 2026 (<n> hrs)").
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
 * summary lines, and grand total with amount-in-words. When a batch has no
 * `scholars_list` loaded, every scholar-dependent amount is "—" with a reason
 * (a loaded empty roster keeps its honest zero).
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
  const n: number | null = batch.scholars_list === undefined ? null : roster.length;

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

  if (trackId === 'training_cost') return buildTrainingCost(batch, roster, n, header);
  if (trackId === 'tsf_allowance') return buildTsfAllowance(batch, roster, n, header);
  return buildEntrepreneurship(batch, roster, n, header);
}

type Header = Omit<
  BillingStatement,
  'subtitle' | 'columns' | 'rows' | 'summary' | 'totalLabel' | 'grandTotal' | 'grandTotalLabel' | 'grandWords' | 'unavailableReason'
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
  reasons: string[],
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
    unavailableReason: reasons.length ? reasons.join(' · ') : null,
  };
}

/**
 * Builds the Training Cost statement (flat per-scholar cost).
 * Matches the source docx exactly.
 */
function buildTrainingCost(batch: Batch, roster: ScholarRow[], n: number | null, header: Header): BillingStatement {
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
  // Unmapped qualification: no rate, so no amount — never a guessed default.
  const reasons = [...(unit === null ? [RATE_UNAVAILABLE] : []), ...(n === null ? [ROSTER_NOT_LOADED] : [])];
  if (unit === null || n === null) {
    const summary = reasons.map((label) => ({ label, amount: '—' }));
    const subtitle = unit === null ? RATE_UNAVAILABLE : `${formatPeso(unit)} per scholar`;
    return finalize(header, `${subtitle} · ${header.scholarsLabel}`, columns, rows, summary, null, reasons);
  }
  const grandTotal = unit * n;
  const summary: StatementSummaryLine[] = [
    { label: `${n} scholars × ${formatPeso(unit)}`, amount: formatPeso(grandTotal) },
  ];
  return finalize(header, `${formatPeso(unit)} per scholar · ${header.scholarsLabel}`, columns, rows, summary, grandTotal, []);
}

/**
 * Builds the TSF / Allowance statement. Includes TSF days plus (CFSP only)
 * New Normal Assistance and Accident Insurance per scholar.
 */
function buildTsfAllowance(batch: Batch, roster: ScholarRow[], n: number | null, header: Header): BillingStatement {
  const cfsp = isCfsp(batch.program);
  const days = tsfDaysForBatch(batch);
  const tsf = days === null ? null : days * TSF_DAY_RATE;
  // A per-scholar total exists only when every component has a rate; never a partial sum.
  const perScholar = tsf === null ? null : tsf + (cfsp ? NEW_NORMAL_ASSISTANCE + ACCIDENT_INSURANCE : 0);

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
      perScholar === null ? '—' : formatPeso(perScholar),
    ],
  }));

  const grandTotal = perScholar !== null && n !== null ? perScholar * n : null;
  const times = n === null ? ' per scholar' : ` × ${n}`;
  const amount = (unit: number) => (n === null ? '—' : formatPeso(unit * n));
  const summary: StatementSummaryLine[] = [
    tsf === null
      ? { label: `TSF — ${RATE_UNAVAILABLE}`, amount: '—' }
      : { label: `TSF — ${days} days × ${pesoLabel(TSF_DAY_RATE)}${times}`, amount: amount(tsf) },
    ...(cfsp
      ? [
          { label: `New Normal Assistance — ${pesoLabel(NEW_NORMAL_ASSISTANCE)}${times}`, amount: amount(NEW_NORMAL_ASSISTANCE) },
          { label: `Accident Insurance — ${pesoLabel(ACCIDENT_INSURANCE)}${times}`, amount: amount(ACCIDENT_INSURANCE) },
        ]
      : []),
  ];
  const reasons = [...(tsf === null ? [RATE_UNAVAILABLE] : []), ...(n === null ? [ROSTER_NOT_LOADED] : [])];
  const subtitle = perScholar === null ? RATE_UNAVAILABLE : `${formatPeso(perScholar)} per scholar`;
  return finalize(header, `${subtitle} · ${header.scholarsLabel}`, columns, rows, summary, grandTotal, reasons);
}

/**
 * Builds the Entrepreneurship statement. ₱800 per scholar, CFSP only
 * (single payment on delivery).
 */
function buildEntrepreneurship(batch: Batch, roster: ScholarRow[], n: number | null, header: Header): BillingStatement {
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
  const subtitle = `${pesoLabel(ENTREPRENEURSHIP_FEE)} per scholar · ${header.scholarsLabel}`;
  if (n === null) {
    const summary = [{ label: ROSTER_NOT_LOADED, amount: '—' }];
    return finalize(header, subtitle, columns, rows, summary, null, [ROSTER_NOT_LOADED]);
  }
  const grandTotal = ENTREPRENEURSHIP_FEE * n;
  const summary: StatementSummaryLine[] = [
    { label: `${pesoLabel(ENTREPRENEURSHIP_FEE)} × ${n} scholars`, amount: formatPeso(grandTotal) },
  ];
  return finalize(header, subtitle, columns, rows, summary, grandTotal, []);
}
