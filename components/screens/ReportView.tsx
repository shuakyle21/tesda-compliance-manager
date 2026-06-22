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
import { Icon, type IconName } from '@/components/ui/Icon';
import { Toast, type ToastData } from '@/components/ui/Toast';
import { EGACE_STAGES, EMPLOYMENT_STATUSES, TENANTS } from '@/lib/data/seed';
import type { Batch, EgaceCounts, Tenant } from '@/lib/data/types';

/* ============================ xlsx writer ============================ */
// A self-contained .xlsx emitter: zip-store (no compression) wrapping the
// minimal OOXML parts Excel needs. Kept dependency-free so the export matches
// the prototype byte-for-byte and ships nothing extra to the client.
type ZipEntry = { name: string; data: Uint8Array };

const _crcTable: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function _crc32(u8: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = _crcTable[(c ^ u8[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function _zipStore(files: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const u16 = (n: number) => [n & 0xff, (n >> 8) & 0xff];
  const u32 = (n: number) => [n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff];
  files.forEach((f) => {
    const nameB = enc.encode(f.name);
    const crc = _crc32(f.data);
    const size = f.data.length;
    const local = new Uint8Array(
      ([] as number[]).concat(u32(0x04034b50), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0)),
    );
    chunks.push(local, nameB, f.data);
    const cen = new Uint8Array(
      ([] as number[]).concat(u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(0), u16(0), u32(crc), u32(size), u32(size), u16(nameB.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset)),
    );
    central.push(cen, nameB);
    offset += local.length + nameB.length + f.data.length;
  });
  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(
    ([] as number[]).concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralSize), u32(offset), u16(0)),
  );
  const all = chunks.concat(central, [eocd]);
  const total = all.reduce((s, a) => s + a.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  all.forEach((a) => {
    out.set(a, p);
    p += a.length;
  });
  return out;
}

function _xmlEsc(s: unknown): string {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _colRef(i: number): string {
  let s = '';
  i++;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

function buildXlsx(headers: string[], rows: string[][], sheetName: string): Blob {
  const enc = new TextEncoder();
  const rowXml = (cells: string[], r: number) =>
    `<row r="${r}">` +
    cells
      .map((v, ci) => `<c r="${_colRef(ci)}${r}" t="inlineStr"><is><t xml:space="preserve">${_xmlEsc(v)}</t></is></c>`)
      .join('') +
    '</row>';
  const body = [rowXml(headers, 1)];
  rows.forEach((row, ri) => body.push(rowXml(row, ri + 2)));
  const sheet =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetData>' +
    body.join('') +
    '</sheetData></worksheet>';
  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${_xmlEsc(sheetName).slice(0, 28)}" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
  const rels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';
  const ct =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';
  const zipped = _zipStore([
    { name: '[Content_Types].xml', data: enc.encode(ct) },
    { name: '_rels/.rels', data: enc.encode(rels) },
    { name: 'xl/workbook.xml', data: enc.encode(workbook) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(wbRels) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheet) },
  ]);
  return new Blob([zipped as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

/* T2MIS terminal-report column order (matches the imported file) */
const T2MIS_HEADERS = [
  'Region', 'Province', 'Congressional District', 'Municipality City', 'Name of Provider',
  'Complete Address', 'Type of Provider', 'Classification of Provider', 'Industry Sector of Qualification',
  'TVET Program Registration Status', 'Qualification Program Title', 'Cluster', 'CTPR',
  'Training Calendar Code', 'Delivery Mode', 'Last Name', 'First Name', 'Middle Name', 'Extension Name',
  'ULI', 'Contact Number', 'E mail Address', 'Street No and Street address', 'Barangay', 'District',
  'Province ', 'Sex', 'Date of Birth', 'Age', 'Civil Status', 'Highest Grade Completed', 'Nationality',
  'Classification of Clients', 'Training Status', 'Type of Scholarships', 'Voucher Number',
  'Date Started', 'Date Finished', 'Date Assessed', 'Assessment Results',
  'Employment Status Before the Training', 'Date Of Employment', 'Occupation', 'Name of Employer',
  'Address', 'Classification', 'Salary',
];

/* ============================ component ============================ */
interface ReportViewProps {
  batches: Batch[];
  tenants?: Tenant[];
  /** Show School column + school count. Defaults to true when batches span >1 tenant. */
  multiSchool?: boolean;
}

const ES = EMPLOYMENT_STATUSES;
const stages = EGACE_STAGES;
const today = 'June 8, 2026';

export function ReportView({ batches, tenants = TENANTS, multiSchool }: ReportViewProps) {
  const [active, setActive] = useState<'egace' | 'employment'>('egace');
  const [toast, setToast] = useState<ToastData | null>(null);

  // Registrar portfolio: derive multi-school from the data unless told otherwise.
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

  const colorVar = (k: string) => `var(--color-${k})`;
  const colorLt = (k: string) => `var(--color-${k}-lt)`;
  const colorDk = (k: string) => `var(--color-${k}-dk)`;
  const egaceVal = (b: Batch, key: string) => (b.egace ? b.egace[key as keyof EgaceCounts] ?? 0 : 0);

  /* ── EGACE totals ── */
  const totals: Record<string, number> = { enrolled: 0, graduate: 0, assessed: 0, certified: 0, employed: 0 };
  rows.forEach((b) => stages.forEach((s) => (totals[s.key] += egaceVal(b, s.key))));
  const rate = (v: number) => (totals.enrolled ? Math.round((v / totals.enrolled) * 100) : 0);

  /* ── Employment roster (certified scholars in follow-up) ── */
  const empCohorts = rows.filter((b) => b.employmentFollowUp);
  const empScholars: { batch: Batch; s: NonNullable<Batch['scholars_list']>[number] }[] = [];
  empCohorts.forEach((b) => {
    (b.scholars_list || []).forEach((s) => {
      if (s.assessmentResult === 'Competent') empScholars.push({ batch: b, s });
    });
  });
  const empTotals = { certified: 0, employed: 0, awaiting: 0, unemployed: 0 };
  empScholars.forEach((r) => {
    empTotals.certified++;
    if (r.s.employmentStatus === ES.wage || r.s.employmentStatus === ES.self) empTotals.employed++;
    else if (r.s.employmentStatus === ES.awaiting) empTotals.awaiting++;
    else if (r.s.employmentStatus === ES.unemployed) empTotals.unemployed++;
  });
  const empRate = empTotals.certified ? Math.round((empTotals.employed / empTotals.certified) * 100) : 0;

  const empTone = (status: string) => {
    if (status === ES.wage) return 'green';
    if (status === ES.self) return 'teal';
    if (status === ES.awaiting) return 'amber';
    if (status === ES.unemployed) return 'red';
    return 'neutral';
  };

  /* ── Export → real .xlsx (T2MIS) ── */
  function exportXlsx() {
    const data: string[][] = [];
    rows.forEach((b) => {
      const t = tenantOf(b.tenantId);
      const reg = (t.region || '').split('·');
      const region = (reg[0] || '').trim();
      const province = (reg[1] || '').trim();
      (b.scholars_list || []).forEach((s) => {
        data.push([
          region, province, '', '', t.name,
          t.region || '', 'Private', 'TVIs', 'Agriculture, Forestry and Fishery',
          'WTR', b.qualification, '', '',
          b.id, 'Institution-Based Training (IBT)',
          s.lastName, s.firstName, s.middleInit, s.extName,
          s.uli, s.contact, s.email, '', '', '',
          province, s.sex, s.dob, String(s.age), s.civilStatus, s.education, s.nationality,
          s.clientClass, s.trainingStatus, s.scholarshipType, '',
          s.dateStarted, s.dateFinished, s.dateAssessed, s.assessmentResult,
          s.empStatusBefore, s.dateEmployed, s.occupation, s.employer,
          s.employer && s.employer !== 'Self-employed' ? t.region || '' : '', s.empClassification, s.salary,
        ]);
      });
    });
    try {
      const blob = buildXlsx(T2MIS_HEADERS, data, 'EGACE-Employment');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'TESDA-T2MIS-EGACE-Employment-Report.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast({
        title: 'Excel export ready',
        message: `TESDA-T2MIS-EGACE-Employment-Report.xlsx downloaded — ${data.length} scholar records across ${rows.length} batches.`,
      });
    } catch {
      setToast({ title: 'Export failed', message: 'Could not build the workbook in this browser.' });
    }
  }

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
      {/* ── Toolbar: section toggle + export ── */}
      <div className="report-toolbar">
        <div className="report-seg" role="tablist">
          <button className={'report-seg-btn' + (active === 'egace' ? ' active' : '')} onClick={() => setActive('egace')}>
            <Icon name="certificate" size={13} />
            EGACE Outcomes
          </button>
          <button className={'report-seg-btn' + (active === 'employment' ? ' active' : '')} onClick={() => setActive('employment')}>
            <Icon name="briefcase" size={13} />
            Employment Report
          </button>
        </div>
        <div className="report-toolbar-meta">
          <span>
            {isMulti ? tenants.length + ' schools · ' : ''}
            {rows.length} batches · as of {today}
          </span>
          <button className="btn secondary" onClick={exportXlsx}>
            <Icon name="download" size={14} />
            Export to Excel (T2MIS)
          </button>
        </div>
      </div>

      {active === 'egace' ? (
        <>
          {/* Summary funnel strip */}
          <div className="egace-summary">
            {stages.map((s, i) => {
              const val = totals[s.key];
              const pct = i === 0 ? 100 : rate(val);
              return (
                <div key={s.key} style={{ display: 'contents' }}>
                  <div className="egace-summary-tile" style={{ background: colorLt(s.colorKey), borderColor: colorVar(s.colorKey) }}>
                    <div className="egace-summary-top">
                      <span className="egace-summary-icon" style={{ color: colorDk(s.colorKey) }}>
                        <Icon name={s.icon as IconName} size={14} />
                      </span>
                      <span className="egace-summary-label" style={{ color: colorDk(s.colorKey) }}>
                        {s.label}
                      </span>
                    </div>
                    <div className="egace-summary-val" style={{ color: colorDk(s.colorKey) }}>
                      {val}
                    </div>
                    <div className="egace-summary-rate" style={{ color: colorDk(s.colorKey) }}>
                      {i === 0 ? 'of cohort' : pct + '% of enrolled'}
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="egace-summary-arrow">
                      <Icon name="chevron-right" size={16} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* EGACE table */}
          <div className="egace-table-card surface">
            <div className="egace-table-head">
              <div>
                <h2 className="egace-table-title">EGACE Outcomes</h2>
                <span className="egace-table-sub">
                  {rows.length} {rows.length === 1 ? 'batch' : 'batches'} · TESDA TWSP &amp; CFSP · as of {today}
                </span>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="egace-table">
                <colgroup>
                  <col style={{ width: 64 }} />
                  {isMulti && <col style={{ width: 70 }} />}
                  <col style={{ width: 190 }} />
                  <col style={{ width: 170 }} />
                  <col style={{ width: 88 }} />
                  <col style={{ width: 88 }} />
                  {stages.map((s) => (
                    <col key={s.key} style={{ width: 84 }} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    <th rowSpan={2} className="egc-th egc-num">
                      Batch No.
                    </th>
                    {isMulti && (
                      <th rowSpan={2} className="egc-th">
                        School
                      </th>
                    )}
                    <th rowSpan={2} className="egc-th">
                      Qualification
                    </th>
                    <th rowSpan={2} className="egc-th">
                      Trainer
                    </th>
                    <th colSpan={2} className="egc-th egc-group">
                      Training Schedule
                    </th>
                    {stages.map((s) => (
                      <th key={s.key} rowSpan={2} className="egc-th egc-num egc-stage" style={{ color: colorDk(s.colorKey), borderTopColor: colorVar(s.colorKey) }}>
                        {s.label}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    <th className="egc-th egc-sub">Start</th>
                    <th className="egc-th egc-sub">End</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((b, i) => (
                    <tr key={b.id} className={i % 2 === 0 ? 'egc-row-odd' : ''}>
                      <td className="egc-td egc-num egc-batchno">{i + 1}</td>
                      {isMulti && <td className="egc-td egc-mono">{tenantOf(b.tenantId).code}</td>}
                      <td className="egc-td">
                        <div className="egc-qual">{b.qualification}</div>
                        <div className="egc-meta">
                          {b.program} · {b.id}
                          {b.status === 'completed' ? ' · completed' : ''}
                        </div>
                      </td>
                      <td className="egc-td egc-trainer">{b.trainer}</td>
                      <td className="egc-td egc-mono">{b.trainingStart.replace(/,\s*\d{4}$/, '')}</td>
                      <td className="egc-td egc-mono">{b.trainingEnd.replace(/,\s*\d{4}$/, '')}</td>
                      {stages.map((s) => {
                        const v = egaceVal(b, s.key);
                        return (
                          <td key={s.key} className="egc-td egc-num egc-val" style={{ color: v === 0 ? 'var(--color-text-disabled)' : colorDk(s.colorKey) }}>
                            {v === 0 ? '—' : v}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="egc-total-row">
                    <td className="egc-td egc-total-label" colSpan={isMulti ? 5 : 4}>
                      TOTAL
                    </td>
                    {stages.map((s) => (
                      <td key={s.key} className="egc-td egc-num egc-total-val" style={{ color: colorDk(s.colorKey) }}>
                        {totals[s.key]}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="egace-footnote">
              <Icon name="info-circle" size={12} />
              <span>
                Funnel fills as each cohort advances — columns stay blank (—) for batches still in training. Conversion vs enrolled: {rate(totals.graduate)}% graduated · {rate(totals.certified)}% certified · {rate(totals.employed)}% employed.
              </span>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Employment summary */}
          <div className="emp-summary">
            <div className="emp-stat">
              <div className="emp-stat-label">Certified (eligible)</div>
              <div className="emp-stat-val">{empTotals.certified}</div>
            </div>
            <div className="emp-stat" style={{ background: 'var(--color-green-lt)', borderColor: 'var(--color-green)' }}>
              <div className="emp-stat-label" style={{ color: 'var(--color-green-dk)' }}>
                Employed
              </div>
              <div className="emp-stat-val" style={{ color: 'var(--color-green-dk)' }}>
                {empTotals.employed}
              </div>
            </div>
            <div className="emp-stat" style={{ background: 'var(--color-blue-lt)', borderColor: 'var(--color-blue)' }}>
              <div className="emp-stat-label" style={{ color: 'var(--color-blue-dk)' }}>
                Employment rate
              </div>
              <div className="emp-stat-val" style={{ color: 'var(--color-blue-dk)' }}>
                {empRate}%
              </div>
            </div>
            <div className="emp-stat" style={{ background: 'var(--color-amber-lt)', borderColor: 'var(--color-amber-border)' }}>
              <div className="emp-stat-label" style={{ color: 'var(--color-amber-dk)' }}>
                Awaiting follow-up
              </div>
              <div className="emp-stat-val" style={{ color: 'var(--color-amber-dk)' }}>
                {empTotals.awaiting}
              </div>
            </div>
            <div className="emp-stat" style={{ background: 'var(--color-red-lt)', borderColor: 'var(--color-red-border)' }}>
              <div className="emp-stat-label" style={{ color: 'var(--color-red-dk)' }}>
                Unemployed
              </div>
              <div className="emp-stat-val" style={{ color: 'var(--color-red-dk)' }}>
                {empTotals.unemployed}
              </div>
            </div>
          </div>

          {/* Cohort follow-up windows */}
          {empCohorts.length > 0 && (
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
          )}

          {/* Per-scholar employment table */}
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
                      const tone = empTone(r.s.employmentStatus);
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
        </>
      )}

      {toast && <Toast title={toast.title} message={toast.message} onDismiss={() => setToast(null)} />}
    </div>
  );
}

export default ReportView;
