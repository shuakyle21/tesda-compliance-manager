'use client';

/**
 * Inline editor for a batch's RQM code (the TESDA Notice-to-Proceed code),
 * shown in the batch modal for admins and coordinators only.
 *
 * Hiding this for other roles is usability. The action re-checks the role on
 * the server and RLS refuses the write — see `app/(dashboard)/t/[tenantCode]/actions.ts`.
 */

import { useActionState, useId, useRef, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import { normalizeRqmCode, type RqmFormState } from '@/modules/batches/domain/rqm';
import type { Batch } from '@/shared/types';

type Mode = 'view' | 'edit' | 'confirm-replace' | 'confirm-remove';

const IDLE: RqmFormState = { status: 'idle' };
const SMALL = { height: 28, fontSize: 12 } as const;

/** Where the editor goes when an action result arrives: close on success, step back on failure. */
function modeAfter(state: RqmFormState, mode: Mode): Mode {
  if (state.status === 'saved') return 'view';
  if (state.status === 'idle') return mode;
  return mode === 'confirm-remove' ? 'view' : 'edit';
}

function failureMessage(state: RqmFormState): string | null {
  if (state.status === 'invalid' || state.status === 'error') return state.message;
  return state.status === 'denied' ? "You don't have permission to change this." : null;
}

export function RqmCodeEditor({
  batch,
  tenantCode,
  action,
}: {
  batch: Pick<Batch, 'id' | 'rqmCode' | 'program'>;
  tenantCode: string;
  action: (previous: RqmFormState, formData: FormData) => Promise<RqmFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, IDLE);
  const [mode, setMode] = useState<Mode>('view');
  const [draft, setDraft] = useState('');
  const [seen, setSeen] = useState<RqmFormState>(IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();

  // The modal's `batch` prop is stale until the page refreshes, so once a save
  // has succeeded the action's result is the truth.
  const current = state.status === 'saved' ? state.code : batch.rqmCode;
  const next = normalizeRqmCode(draft);
  const message = failureMessage(state);

  if (state !== seen) {
    setSeen(state);
    setMode(modeAfter(state, mode));
  }

  function open() {
    setDraft(current ?? '');
    setMode('edit');
  }

  // Replacing or removing a recorded code always passes through a confirm step.
  function save() {
    if (!current) formRef.current?.requestSubmit();
    else if (!next) setMode('confirm-remove');
    else if (next === current) setMode('view');
    else setMode('confirm-replace');
  }

  return (
    <form ref={formRef} action={formAction} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input type="hidden" name="tenantCode" value={tenantCode} />
      <input type="hidden" name="batchCode" value={batch.id} />
      <input type="hidden" name="expectedPrevious" value={current ?? ''} />
      <input type="hidden" name="source" value="manual" />

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
          <EditField id={id} draft={draft} onDraft={setDraft} onEnter={() => !pending && save()} pending={pending} invalid={message !== null} />
          <div style={ROW}>
            <PendingButton primary pending={pending} onClick={save}>Save</PendingButton>
            <button type="button" className="btn ghost" style={SMALL} disabled={pending} onClick={() => setMode('view')}>Cancel</button>
            {current && (
              <button type="button" className="btn" style={SMALL} disabled={pending} onClick={() => setMode('confirm-remove')}>Remove code</button>
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
          onBack={() => setMode(mode === 'confirm-replace' ? 'edit' : 'view')}
        />
      )}

      {message && (
        <p className="user-form-error" id={`${id}-error`} role="alert">
          <Icon name="alert-circle" size={14} />
          <span>{message}</span>
        </p>
      )}

      {mode === 'view' && state.status === 'saved' && <SavedNote warnings={state.warnings} logFailed={state.logFailed} />}
    </form>
  );
}

const ROW = { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } as const;

function PendingButton({
  pending,
  primary,
  submit,
  onClick,
  children,
}: {
  pending: boolean;
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
      disabled={pending}
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
  return (
    <>
      <input type="hidden" name="rqmCode" value={replace ? draft : ''} />
      <p style={{ fontSize: 13, margin: 0 }}>
        {replace ? `Replace ${current} with ${next}?` : `Remove ${current} from this batch?`}
      </p>
      <div style={ROW}>
        <PendingButton primary pending={pending} submit>{replace ? 'Replace' : 'Remove'}</PendingButton>
        <button type="button" className="btn ghost" style={SMALL} disabled={pending} onClick={onBack}>Back</button>
      </div>
    </>
  );
}
