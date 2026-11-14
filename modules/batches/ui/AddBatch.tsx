'use client';

/**
 * "Add new batch": an NTP upload modal on the batch cards screen (TES-105,
 * ADR-009 NTP6). Shown to admins and coordinators only.
 *
 * The PDF is read on this device; the coordinator checks every allocation row,
 * enters the receipt date, attaches the school's Affidavit of Undertaking when
 * none is on file for that year, and saves. Hiding the button for other roles
 * is usability: the action re-checks the role and RLS refuses the write.
 */

import { startTransition, useActionState, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { parseNtpText, programOfRqmCode, type NtpDraft, type NtpDraftRow, type NtpFormState } from '@/modules/batches/domain/ntp';
import { normalizeRqmCode, type NtpReadResult } from '@/modules/batches/domain/rqm';
import { aouOnFile, fiscalYearOf } from '@/modules/tenancy/domain/aou';
import { readPdfText } from '@/modules/batches/ui/ntpPdfText';
import { PdfPickButton } from '@/modules/batches/ui/PdfPickButton';

export type AddBatchProps = {
  tenantCode: string;
  /** The school's province, used to split the province from the qualification on each row. */
  province: string;
  /** Fiscal years that already have an AOU on file. */
  aouYears: number[];
  action: (previous: NtpFormState, formData: FormData) => Promise<NtpFormState>;
};

export function AddBatch(props: AddBatchProps) {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={opener} type="button" className="btn primary" onClick={() => setOpen(true)}>
        <Icon name="plus" size={14} />Add new batch
      </button>
      {open && (
        <AddBatchModal
          {...props}
          onClose={() => {
            setOpen(false);
            opener.current?.focus();
          }}
        />
      )}
    </>
  );
}

const READ_FAILURE: Record<Exclude<NtpReadResult, { ok: true }>['reason'], string> = {
  'not-pdf': 'Choose a PDF file.',
  'too-large': 'This file is larger than 50 MB.',
  'no-text': "This PDF has no readable text (it may be a scan), so batches can't be created from it.",
  unreadable: "This PDF couldn't be read.",
};

const IDLE: NtpFormState = { status: 'idle' };

function failureText(state: NtpFormState): string | null {
  if (state.status === 'invalid' || state.status === 'error') return state.message;
  if (state.status === 'denied') return "You don't have permission to create batches.";
  if (state.status === 'aou-required') return `No Affidavit of Undertaking is on file for ${state.year}. Attach it to continue.`;
  return null;
}

function AddBatchModal({ tenantCode, province, aouYears, action, onClose }: AddBatchProps & { onClose: () => void }) {
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const [ntpFile, setNtpFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [draft, setDraft] = useState<NtpDraft | null>(null);
  const [receiptDate, setReceiptDate] = useState('');
  const [aouFile, setAouFile] = useState<File | null>(null);
  const [state, dispatch, pending] = useActionState(action, IDLE);
  // Latest read wins: a slower earlier read must not overwrite a newer file.
  const latest = useRef(0);

  const needsAou = aouNeeded(state, aouYears, receiptDate);
  const message = readError ?? failureText(state);
  const saved = state.status === 'saved' ? state : null;

  useFocusTrap(dialog, pending ? () => {} : onClose);

  async function read(file: File | undefined) {
    if (!file) return;
    const mine = ++latest.current;
    setReading(true);
    setReadError(null);
    setDraft(null);
    const result = await readPdfText(file);
    if (mine !== latest.current) return;
    setReading(false);
    if (!result.ok) return setReadError(READ_FAILURE[result.reason]);
    const parsed = parseNtpText(result.text, { province });
    if (parsed.rows.length === 0) return setReadError('No allocation rows were found in this PDF.');
    setNtpFile(file);
    setTruncated(Boolean(result.truncated));
    setDraft(parsed);
  }

  function updateRow(i: number, patch: Partial<NtpDraftRow>) {
    setDraft((d) => d && { ...d, rows: d.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  }

  function save() {
    if (!draft || !ntpFile) return;
    const fd = new FormData();
    fd.set('tenantCode', tenantCode);
    fd.set('receiptDate', receiptDate);
    fd.set('ntpDate', draft.ntpDate);
    fd.set('approvalDate', draft.approvalDate);
    fd.set('rows', JSON.stringify(draft.rows));
    fd.set('ntpFile', ntpFile);
    if (needsAou && aouFile) fd.set('aouFile', aouFile);
    startTransition(() => dispatch(fd));
  }

  const count = draft?.rows.length ?? 0;
  const ready = canSave({ hasDraft: draft !== null, reading, receiptDate, needsAou, hasAou: aouFile !== null });
  return (
    <>
      <div className="scrim" onClick={pending ? undefined : onClose} />
      <div ref={dialog} className="modal" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} style={{ maxWidth: 760, width: 'calc(100% - 32px)' }}>
        <div className="modal-head">
          <h3 id={`${id}-title`} tabIndex={-1}>Add new batch</h3>
          <button type="button" className="icon-btn" onClick={onClose} disabled={pending} aria-label="Close">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {saved ? (
            <SavedSummary codes={saved.codes} logFailed={saved.logFailed} />
          ) : (
            <>
              <PdfPickButton
                id={id}
                label={draft ? 'Choose a different NTP PDF' : 'Choose NTP PDF'}
                note="Read on this device, then stored when you save."
                reading={reading}
                disabled={pending}
                onFile={read}
              />
              {truncated && <Note icon="alert-triangle">Only the first 50 pages were read.</Note>}
              {draft && (
                <DraftForm
                  id={id}
                  draft={draft}
                  receiptDate={receiptDate}
                  needsAou={needsAou}
                  aouFile={aouFile}
                  disabled={pending}
                  onDraft={setDraft}
                  onReceiptDate={setReceiptDate}
                  onAouFile={setAouFile}
                  onRow={updateRow}
                />
              )}
              <ErrorLine message={message} />
            </>
          )}
        </div>

        <ModalFoot saved={saved !== null} pending={pending} ready={ready} count={count} onClose={onClose} onSave={save} />
      </div>
    </>
  );
}

/** True when the school needs to attach an AOU. The server may know of a change the page does not, so its answer wins. */
function aouNeeded(state: NtpFormState, aouYears: number[], receiptDate: string): boolean {
  if (!receiptDate) return false;
  const yearsOnFile = state.status === 'aou-required' ? aouYears.filter((y) => y !== state.year) : aouYears;
  return !aouOnFile(yearsOnFile, receiptDate);
}

function canSave(s: { hasDraft: boolean; reading: boolean; receiptDate: string; needsAou: boolean; hasAou: boolean }): boolean {
  return s.hasDraft && !s.reading && s.receiptDate !== '' && (!s.needsAou || s.hasAou);
}

function ErrorLine({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="user-form-error" role="alert">
      <Icon name="alert-circle" size={14} />
      <span>{message}</span>
    </p>
  );
}

function DraftForm({
  id, draft, receiptDate, needsAou, aouFile, disabled, onDraft, onReceiptDate, onAouFile, onRow,
}: {
  id: string;
  draft: NtpDraft;
  receiptDate: string;
  needsAou: boolean;
  aouFile: File | null;
  disabled: boolean;
  onDraft: (d: NtpDraft) => void;
  onReceiptDate: (v: string) => void;
  onAouFile: (f: File | null) => void;
  onRow: (i: number, patch: Partial<NtpDraftRow>) => void;
}) {
  const count = draft.rows.length;
  return (
    <>
      <NtpHeader id={id} draft={draft} disabled={disabled} onChange={(patch) => onDraft({ ...draft, ...patch })} />
      <DateField
        id={`${id}-receipt`}
        label="Date your school received the NTP"
        hint="From the email TESDA sent. The 15-day commencement window counts from this date."
        value={receiptDate}
        disabled={disabled}
        onChange={onReceiptDate}
      />
      {receiptDate && (
        <AouStep id={id} year={fiscalYearOf(receiptDate)} needsAou={needsAou} file={aouFile} disabled={disabled} onFile={onAouFile} />
      )}
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 8 }}>
          {count === 1 ? 'Allocation row (one batch)' : `Allocation rows (${count} batches)`}
        </legend>
        {draft.rows.map((row, i) => (
          <RowCard key={i} id={`${id}-row${i}`} n={i + 1} row={row} disabled={disabled} onChange={(patch) => onRow(i, patch)} />
        ))}
      </fieldset>
    </>
  );
}

function ModalFoot({
  saved, pending, ready, count, onClose, onSave,
}: { saved: boolean; pending: boolean; ready: boolean; count: number; onClose: () => void; onSave: () => void }) {
  return (
    <div className="modal-foot">
      <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
        {saved ? (
          <button type="button" className="btn primary" onClick={onClose}>Done</button>
        ) : (
          <>
            <button type="button" className="btn secondary" onClick={onClose} disabled={pending}>Cancel</button>
            <button
              type="button"
              className={`btn primary${pending ? ' loading' : ''}`}
              disabled={!ready || pending}
              aria-busy={pending}
              onClick={onSave}
            >
              {count === 1 ? 'Create 1 batch' : `Create ${count} batches`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/** Keeps Tab inside the dialog, closes on Escape, and starts on the title. */
function useFocusTrap(ref: React.RefObject<HTMLDivElement | null>, onEscape: () => void) {
  const escape = useRef(onEscape);
  useEffect(() => {
    escape.current = onEscape;
  });
  useEffect(() => {
    const el = ref.current;
    el?.querySelector<HTMLElement>('h3')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return escape.current();
      if (e.key !== 'Tab' || !el) return;
      const focusable = [...el.querySelectorAll<HTMLElement>('button, input, [href], select, textarea')].filter(
        (n) => !n.hasAttribute('disabled') && n.tabIndex !== -1,
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref]);
}

function Note({ icon, children }: { icon: 'alert-triangle' | 'check' | 'info-circle'; children: React.ReactNode }) {
  return (
    <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, margin: 0, color: 'var(--color-text-secondary)' }}>
      <Icon name={icon} size={14} />
      <span>{children}</span>
    </p>
  );
}

function NtpHeader({ id, draft, disabled, onChange }: { id: string; draft: NtpDraft; disabled: boolean; onChange: (patch: Partial<NtpDraft>) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
      <div className="user-form-field">
        <span className="user-form-label">School on the NTP</span>
        <span style={{ fontSize: 13 }}>{draft.schoolName || 'Not read from the PDF'}</span>
      </div>
      <DateField id={`${id}-ntpdate`} label="Date on the NTP" value={draft.ntpDate} disabled={disabled} onChange={(ntpDate) => onChange({ ntpDate })} />
      <DateField id={`${id}-approval`} label="Approval date shown on the NTP" value={draft.approvalDate} disabled={disabled} onChange={(approvalDate) => onChange({ approvalDate })} />
    </div>
  );
}

function AouStep({ id, year, needsAou, file, disabled, onFile }: { id: string; year: number; needsAou: boolean; file: File | null; disabled: boolean; onFile: (f: File | null) => void }) {
  if (!needsAou) return <Note icon="check">Affidavit of Undertaking on file for {year}.</Note>;
  return (
    <div className="user-form-field">
      <label className="user-form-label" htmlFor={`${id}-aou`}>Affidavit of Undertaking (notarized), covers {year}</label>
      <input
        id={`${id}-aou`}
        type="file"
        className="input"
        accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
        disabled={disabled}
        aria-describedby={`${id}-aou-hint`}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      <p className="user-form-hint" id={`${id}-aou-hint`}>
        {file ? `Attached: ${file.name}. ` : ''}No AOU is on file for {year}. It is recorded once per fiscal year, for every program.
      </p>
    </div>
  );
}

function RowCard({ id, n, row, disabled, onChange }: { id: string; n: number; row: NtpDraftRow; disabled: boolean; onChange: (patch: Partial<NtpDraftRow>) => void }) {
  const program = programOfRqmCode(normalizeRqmCode(row.rqmCode));
  return (
    <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: 12, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
      <TextField id={`${id}-code`} label={`Row ${n}: RQM code`} value={row.rqmCode} disabled={disabled} mono onChange={(rqmCode) => onChange({ rqmCode })} />
      <div className="user-form-field">
        <span className="user-form-label">Program</span>
        <span style={{ fontSize: 13 }}>{program || 'Read from the RQM code'}</span>
      </div>
      <TextField id={`${id}-qual`} label="Qualification" value={row.qualification} disabled={disabled} onChange={(qualification) => onChange({ qualification })} />
      <TextField id={`${id}-slots`} label="Approved slots" value={row.approvedSlots} disabled={disabled} inputMode="numeric" onChange={(approvedSlots) => onChange({ approvedSlots })} />
      <TextField id={`${id}-amount`} label="Total amount (PHP)" value={row.totalAmount} disabled={disabled} inputMode="decimal" onChange={(totalAmount) => onChange({ totalAmount })} />
      <DateField id={`${id}-start`} label="Indicative start date" value={row.indicativeStartDate} disabled={disabled} onChange={(indicativeStartDate) => onChange({ indicativeStartDate })} />
    </div>
  );
}

function TextField({
  id, label, value, disabled, mono, inputMode, onChange,
}: {
  id: string; label: string; value: string; disabled: boolean; mono?: boolean;
  inputMode?: 'numeric' | 'decimal'; onChange: (v: string) => void;
}) {
  return (
    <div className="user-form-field">
      <label className="user-form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="input"
        type="text"
        autoComplete="off"
        inputMode={inputMode}
        value={value}
        disabled={disabled}
        style={mono ? { fontFamily: 'var(--font-mono)' } : undefined}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DateField({ id, label, hint, value, disabled, onChange }: { id: string; label: string; hint?: string; value: string; disabled: boolean; onChange: (v: string) => void }) {
  return (
    <div className="user-form-field">
      <label className="user-form-label" htmlFor={id}>{label}</label>
      <input id={id} className="input" type="date" value={value} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} onChange={(e) => onChange(e.target.value)} />
      {hint && <p className="user-form-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

function SavedSummary({ codes, logFailed }: { codes: string[]; logFailed: boolean }) {
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <Note icon="check">
        {codes.length === 1 ? 'Batch created' : `${codes.length} batches created`} at the NTP stage: {codes.join(', ')}.
      </Note>
      {logFailed && <Note icon="alert-triangle">The activity log entry could not be written.</Note>}
    </div>
  );
}
