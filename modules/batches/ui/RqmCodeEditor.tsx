'use client';

/**
 * Inline editor for a batch's RQM code (the TESDA Notice-to-Proceed code),
 * shown in the batch modal for admins and coordinators only.
 *
 * Hiding this for other roles is usability. The action re-checks the role on
 * the server and RLS refuses the write — see `app/(dashboard)/t/[tenantCode]/actions.ts`.
 */

import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { normalizeRqmCode, ntpReadOutcome, type NtpOutcome, type RqmFormState } from '@/modules/batches/domain/rqm';
import { readPdfText } from '@/modules/batches/ui/ntpPdfText';
import { PdfPickButton } from '@/modules/batches/ui/PdfPickButton';
import type { Batch } from '@/shared/types';

type Mode = 'view' | 'edit' | 'confirm-replace' | 'confirm-remove';

const IDLE: RqmFormState = { status: 'idle' };
const SMALL = { height: 28, fontSize: 12 } as const;

/** Where the editor goes when an action result arrives: close on success, back to the field on failure. */
function modeAfter(state: RqmFormState, mode: Mode): Mode {
  if (state.status === 'saved') return 'view';
  return state.status === 'idle' ? mode : 'edit';
}

/** 'ntp-pdf' only for a code picked from the list and left untouched; empty or edited is 'manual'. */
function submittedSource(submitted: string, picked: string | null): 'manual' | 'ntp-pdf' {
  return submitted !== '' && submitted === picked ? 'ntp-pdf' : 'manual';
}

function failureMessage(state: RqmFormState): string | null {
  if (state.status === 'invalid' || state.status === 'error') return state.message;
  return state.status === 'denied' ? "You don't have permission to change this." : null;
}

export function RqmCodeEditor({
  batch,
  tenantCode,
  action,
  takenCodes,
}: {
  batch: Pick<Batch, 'id' | 'rqmCode' | 'program'>;
  tenantCode: string;
  /** Codes already recorded on other batches of this school. */
  takenCodes?: string[];
  action: (previous: RqmFormState, formData: FormData) => Promise<RqmFormState>;
}) {
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState('');
  const [seen, setSeen] = useState<RqmFormState>(IDLE);
  // The last value known to be stored. The `batch` prop is a snapshot that only
  // refreshes after revalidation, so every save result overrides it here.
  const [current, setCurrent] = useState(batch.rqmCode);
  // Shown only while the form that produced it is open; leaving edit mode clears it.
  const [message, setMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pdf = useNtpPdf(current, takenCodes, setDraft);
  const { clear: clearPdf } = pdf;
  const [state, formAction, pending] = useActionState(async (previous: RqmFormState, formData: FormData) => {
    const result = await action(previous, formData);
    // The stored code changed: a stale code list and its "current" marker must not come back.
    if (result.status === 'saved') clearPdf();
    return result;
  }, IDLE);
  const id = useId();

  const next = normalizeRqmCode(draft);
  const source = submittedSource(mode === 'confirm-remove' ? '' : draft, pdf.picked);

  // Derive state from a new action result during render (guarded by the
  // comparison), the pattern React documents instead of an effect.
  if (state !== seen) {
    setSeen(state);
    setMode(modeAfter(state, mode));
    setMessage(failureMessage(state));
    if (state.status === 'saved') setCurrent(state.code);
  }

  function go(to: Mode) {
    setMessage(null);
    if (to === 'view') pdf.clear();
    setMode(to);
  }

  function open() {
    setDraft(current ?? '');
    go('edit');
  }

  // Replacing or removing a recorded code always passes through a confirm step.
  function save() {
    if (!current) formRef.current?.requestSubmit();
    else if (!next) go('confirm-remove');
    else if (next === current) go('view');
    else go('confirm-replace');
  }

  return (
    <form ref={formRef} action={formAction} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name="tenantCode" value={tenantCode} />
      <input type="hidden" name="batchCode" value={batch.id} />
      <input type="hidden" name="expectedPrevious" value={current ?? ''} />
      <input type="hidden" name="source" value={source} />

      {mode === 'view' && (
        <div style={ROW}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{current ?? 'Not recorded'}</span>
          <button type="button" className="btn" style={SMALL} onClick={open}>
            {current ? 'Change' : 'Add RQM code'}
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <>
          <EditField id={id} draft={draft} onDraft={setDraft} onEnter={() => !pending && !pdf.reading && save()} pending={pending} invalid={message !== null} />
          <NtpReader
            id={id}
            pdf={pdf}
            disabled={pending}
          />
          <div style={ROW}>
            {/* A read in flight may be about to change the field, so Save waits for it. */}
            <PendingButton primary pending={pending} disabled={pdf.reading} onClick={save}>Save</PendingButton>
            <button type="button" className="btn ghost" style={SMALL} disabled={pending} onClick={() => go('view')}>Cancel</button>
            {current && (
              <button type="button" className="btn" style={SMALL} disabled={pending} onClick={() => go('confirm-remove')}>Remove code</button>
            )}
          </div>
        </>
      )}

      {(mode === 'confirm-replace' || mode === 'confirm-remove') && (
        <ConfirmStep
          replace={mode === 'confirm-replace'}
          current={current}
          next={next}
          draft={draft}
          pending={pending}
          onBack={() => go(mode === 'confirm-replace' ? 'edit' : 'view')}
        />
      )}

      <Feedback id={id} mode={mode} message={message} state={state} />
    </form>
  );
}

function Feedback({ id, mode, message, state }: { id: string; mode: Mode; message: string | null; state: RqmFormState }) {
  return (
    <>
      {message && mode !== 'view' && (
        <p className="user-form-error" id={`${id}-error`} role="alert">
          <Icon name="alert-circle" size={14} />
          <span>{message}</span>
        </p>
      )}

      {mode === 'view' && state.status === 'saved' && <SavedNote warnings={state.warnings} logFailed={state.logFailed} />}
    </>
  );
}

/** State for the "Read from NTP PDF" flow. Nothing is chosen or saved until the user acts. */
function useNtpPdf(current: string | null, takenCodes: string[] | undefined, setDraft: (code: string) => void) {
  const [reading, setReading] = useState(false);
  const [outcome, setOutcome] = useState<NtpOutcome | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  // Latest-read-wins: clear, a newer read and unmount all bump it, so a slower read is ignored.
  const latest = useRef(0);
  useEffect(() => () => void latest.current++, []);

  return {
    reading,
    outcome,
    picked,
    clear() {
      latest.current++;
      setReading(false);
      setOutcome(null);
      setPicked(null);
    },
    async read(file: File | undefined) {
      if (!file) return;
      const mine = ++latest.current;
      setReading(true);
      setPicked(null);
      const result = await readPdfText(file);
      if (mine !== latest.current) return;
      setOutcome(ntpReadOutcome(result, current, takenCodes));
      setReading(false);
    },
    pick(code: string) {
      setPicked(code);
      setDraft(code);
    },
  };
}

function NtpReader({ id, pdf, disabled }: { id: string; pdf: ReturnType<typeof useNtpPdf>; disabled: boolean }) {
  const { reading, outcome, picked } = pdf;
  const onPick = pdf.pick;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <PdfPickButton
        id={id}
        small
        label="Read from NTP PDF"
        note="Read on this device. The file is not uploaded."
        reading={reading}
        disabled={disabled}
        onFile={pdf.read}
      />
      {outcome?.kind === 'message' && (
        <p className="user-form-error" role="alert">
          <Icon name="alert-circle" size={14} />
          <span>{outcome.message}</span>
        </p>
      )}
      {outcome?.kind === 'options' && (
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <legend style={{ fontSize: 12, fontWeight: 600, padding: 0, marginBottom: 4 }}>RQM codes found in this PDF</legend>
          {outcome.options.map((o) => (
            <label key={o.code} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input
                type="radio"
                name={`${id}-ntp`}
                checked={picked === o.code}
                disabled={o.disabled || disabled}
                onChange={() => onPick(o.code)}
              />
              <span style={{ fontFamily: 'var(--font-mono)' }}>{o.code}</span>
              {o.mark && (
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                  {o.mark === 'taken' ? 'already on another batch' : 'current'}
                </span>
              )}
            </label>
          ))}
        </fieldset>
      )}
      {outcome?.truncated && <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Only the first 50 pages were read.</span>}
    </div>
  );
}


const ROW = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } as const;

function PendingButton({
  pending,
  disabled,
  primary,
  submit,
  onClick,
  children,
}: {
  pending: boolean;
  disabled?: boolean;
  primary?: boolean;
  submit?: boolean;
  onClick?: () => void;
  children: string;
}) {
  return (
    <button
      type={submit ? 'submit' : 'button'}
      className={`btn${primary ? ' primary' : ''}${pending ? ' loading' : ''}`}
      style={SMALL}
      disabled={pending || disabled}
      aria-busy={pending}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function EditField({
  id,
  draft,
  onDraft,
  onEnter,
  pending,
  invalid,
}: {
  id: string;
  draft: string;
  onDraft: (value: string) => void;
  onEnter: () => void;
  pending: boolean;
  invalid: boolean;
}) {
  return (
    <div className="user-form-field">
      <label className="user-form-label" htmlFor={`${id}-input`}>RQM code</label>
      <input
        id={`${id}-input`}
        name="rqmCode"
        type="text"
        className="input"
        autoComplete="off"
        value={draft}
        onChange={(e) => onDraft(e.target.value)}
        onKeyDown={(e) => {
          // Enter must not bypass the confirm step.
          if (e.key !== 'Enter') return;
          e.preventDefault();
          onEnter();
        }}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={`${id}-hint${invalid ? ` ${id}-error` : ''}`}
        disabled={pending}
      />
      <p className="user-form-hint" id={`${id}-hint`}>
        From the Notice to Proceed table, for example RQM3-2026-CFSP-0000-0001
      </p>
    </div>
  );
}

function SavedNote({ warnings, logFailed }: { warnings: string[]; logFailed: boolean }) {
  const lines = logFailed ? [...warnings, 'The activity log entry could not be written.'] : warnings;
  return (
    <div role="status" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="check" size={14} />Saved.
      </span>
      {lines.map((line) => (
        <span key={line} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="alert-triangle" size={14} />{line}
        </span>
      ))}
    </div>
  );
}

function ConfirmStep({
  replace,
  current,
  next,
  draft,
  pending,
  onBack,
}: {
  replace: boolean;
  current: string | null;
  next: string;
  draft: string;
  pending: boolean;
  onBack: () => void;
}) {
  // Focus the question: the button that opened this step has just been removed.
  // Not the submit button, so a repeated Enter or Space cannot confirm it.
  const questionRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => questionRef.current?.focus(), []);

  return (
    <>
      <input type="hidden" name="rqmCode" value={replace ? draft : ''} />
      <p ref={questionRef} tabIndex={-1} role="alert" style={{ fontSize: 13, margin: 0 }}>
        {replace ? `Replace ${current} with ${next}?` : `Remove ${current} from this batch?`}
      </p>
      {/* Back comes first: it sits where "Save" was, so a double-click on Save lands harmlessly. */}
      <div style={ROW}>
        <button type="button" className="btn ghost" style={SMALL} disabled={pending} onClick={onBack}>Back</button>
        <PendingButton primary pending={pending} submit>{replace ? 'Replace' : 'Remove'}</PendingButton>
      </div>
    </>
  );
}
