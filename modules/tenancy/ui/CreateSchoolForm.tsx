'use client';

/**
 * Create-school form (FR-02, ADR-006) — the platform operator's screen for
 * registering a TVI and the programs its CTPR/COPR covers.
 *
 * Client island because it needs `useActionState` for pending/result state and
 * local state for the repeatable program rows. It holds no rules of its own:
 * the vocabularies it suggests and the messages it shows come from
 * `modules/tenancy/domain/schoolDraft.ts`, the same module the Server Action
 * validates with, so what the form accepts and what the server accepts cannot
 * drift.
 *
 * The action arrives as a prop rather than an import: it lives under `app/`
 * and the import direction runs `app -> modules`, so the page passes it down.
 *
 * Copy rule (RULES.md sec.4): recording a school and its registered programs
 * here is bookkeeping for this internal tool. It is not a TESDA registration
 * and nothing on this screen may read as one.
 */

import { useActionState, useId, useState } from 'react';
import { Icon } from '@/shared/ui/Icon';
import type { IconName } from '@/shared/ui/Icon';
import {
  DELIVERY_MODE_SUGGESTIONS,
  IDLE_CREATE_SCHOOL_STATE,
  PROVIDER_CLASSIFICATION_SUGGESTIONS,
  PROVIDER_TYPE_SUGGESTIONS,
  REGISTRATION_STATUS_SUGGESTIONS,
  SCHOOL_TYPE_SUGGESTIONS,
  type CreateSchoolAction,
  type CreateSchoolFormState,
  type SchoolFieldErrors,
} from '@/modules/tenancy/domain/schoolDraft';

/** A qualification the operator can pick, as `data/schools.ts` shapes it. */
export interface QualificationChoice {
  id: string;
  label: string;
}

export interface CreateSchoolFormProps {
  action: CreateSchoolAction;
  qualifications: QualificationChoice[];
}

/**
 * One result banner spec: which icon, which tone class, what it says.
 *
 * Every state names its own icon and its own words. Tone is carried by the
 * class *in addition to* the icon and the sentence, never alone — an operator
 * who cannot distinguish the greens from the reds still reads "added" versus
 * "couldn't", which is the whole point of RULES.md sec.4 rule 23.
 */
type Banner = { icon: IconName; tone: string; text: string };

function bannerFor(state: CreateSchoolFormState): Banner | null {
  switch (state.status) {
    case 'created':
      return {
        icon: 'check',
        tone: 'success',
        text: `${state.name} (${state.code}) added with ${state.programCount} registered ${
          state.programCount === 1 ? 'program' : 'programs'
        }. Next, give someone at the school access to it.`,
      };
    case 'duplicate-code':
      return {
        icon: 'alert-triangle',
        tone: '',
        text: `The code ${state.code} is already in use by another school, so nothing was saved. Choose a different code.`,
      };
    case 'denied':
      return {
        icon: 'alert-circle',
        tone: 'critical',
        text: 'You do not have permission to add schools. Only the platform operator can.',
      };
    case 'unconfigured':
      return {
        icon: 'alert-circle',
        tone: 'critical',
        text: 'School records are not available in this environment, so nothing was saved.',
      };
    case 'failed':
      return {
        icon: 'refresh',
        tone: 'critical',
        text: 'Something went wrong and nothing was saved. Try again in a moment.',
      };
    case 'invalid':
    case 'idle':
      return null;
  }
}

/** Starts at one row: every school needs at least one registered program. */
const INITIAL_PROGRAM_ROWS = [0];

export function CreateSchoolForm({ action, qualifications }: CreateSchoolFormProps) {
  const [state, formAction, pending] = useActionState(action, IDLE_CREATE_SCHOOL_STATE);
  const fieldId = useId();

  // Row *keys*, not row data. The inputs stay uncontrolled — the browser keeps
  // what was typed, and removing a row by key rather than by index means the
  // remaining rows keep their values instead of shifting up into each other.
  const [rowKeys, setRowKeys] = useState<number[]>(INITIAL_PROGRAM_ROWS);
  const [nextKey, setNextKey] = useState(INITIAL_PROGRAM_ROWS.length);

  const errors: SchoolFieldErrors = state.status === 'invalid' ? state.errors : {};
  const banner = bannerFor(state);

  function addRow() {
    setRowKeys((keys) => [...keys, nextKey]);
    setNextKey((key) => key + 1);
  }

  function removeRow(key: number) {
    // Never remove the last row: an empty list has nothing to type into, and
    // the rule is that a school needs at least one program anyway.
    setRowKeys((keys) => (keys.length > 1 ? keys.filter((k) => k !== key) : keys));
  }

  return (
    <form action={formAction} className="user-form" noValidate>
      {banner && (
        <div
          className={`banner${banner.tone ? ` ${banner.tone}` : ''}`}
          // Result of the operator's own submit: announced, but not urgently
          // enough to interrupt what a screen reader is already saying.
          role="status"
          aria-live="polite"
        >
          <Icon name={banner.icon} size={16} />
          <span className="grow">{banner.text}</span>
        </div>
      )}

      <SchoolIdentityFields idPrefix={fieldId} errors={errors} />
      <SchoolLocationFields idPrefix={fieldId} />
      <SchoolProviderFields idPrefix={fieldId} />

      <fieldset
        className="user-form-field school-form-programs"
        aria-invalid={errors.programs ? true : undefined}
        aria-describedby={errors.programs ? `${fieldId}-programs-error` : undefined}
      >
        <legend className="user-form-label">Registered programs</legend>
        <p className="user-form-hint">
          The qualifications this school is registered to deliver, as listed on
          its Certificate of Program Registration. Add one row per program.
        </p>

        {rowKeys.map((key, index) => (
          <ProgramRow
            key={key}
            idPrefix={`${fieldId}-program-${key}`}
            index={index}
            qualifications={qualifications}
            error={errors.programRows?.[index]}
            canRemove={rowKeys.length > 1}
            onRemove={() => removeRow(key)}
          />
        ))}

        <button type="button" className="btn school-form-add" onClick={addRow}>
          <Icon name="plus" size={16} />
          Add another program
        </button>

        {errors.programs && (
          <FieldError id={`${fieldId}-programs-error`}>{errors.programs}</FieldError>
        )}
      </fieldset>

      <div className="user-form-actions">
        <button
          type="submit"
          className={`btn primary${pending ? ' loading' : ''}`}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? 'Adding…' : 'Add school'}
        </button>
        <p className="user-form-note">
          Records the school in this workspace only. It is not a TESDA
          registration and changes nothing in SIS, T2MIS or BSRS.
        </p>
      </div>
    </form>
  );
}

/**
 * Code and name — the two fields that must be right, split out so the main
 * component's branching stays under the repo's complexity ceiling.
 */
function SchoolIdentityFields({
  idPrefix,
  errors,
}: {
  idPrefix: string;
  errors: SchoolFieldErrors;
}) {
  const codeId = `${idPrefix}-code`;
  const nameId = `${idPrefix}-name`;

  return (
    <>
      <div className="user-form-field">
        <label className="user-form-label" htmlFor={nameId}>
          School name
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          className="input"
          autoComplete="off"
          required
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${nameId}-error` : undefined}
          placeholder="J3ED Farm School"
        />
        {errors.name && <FieldError id={`${nameId}-error`}>{errors.name}</FieldError>}
      </div>

      <div className="user-form-field">
        <label className="user-form-label" htmlFor={codeId}>
          School code
        </label>
        <input
          id={codeId}
          name="code"
          type="text"
          className="input"
          autoComplete="off"
          required
          aria-invalid={errors.code ? true : undefined}
          aria-describedby={errors.code ? `${codeId}-error` : undefined}
          placeholder="J3ED"
        />
        {errors.code && <FieldError id={`${codeId}-error`}>{errors.code}</FieldError>}
        <p className="user-form-hint">
          A short label used throughout the app. Letters and numbers only; it is
          saved in capitals.
        </p>
      </div>
    </>
  );
}

/** Address fields, all optional — the T2MIS export reads them when present. */
function SchoolLocationFields({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <TextField
        id={`${idPrefix}-region`}
        name="region"
        label="Region"
        placeholder="Region IV-A, Quezon"
        optional
      />
      <TextField
        id={`${idPrefix}-province`}
        name="province"
        label="Province"
        placeholder="Quezon"
        optional
      />
      <TextField
        id={`${idPrefix}-city`}
        name="cityMunicipality"
        label="City or municipality"
        placeholder="Candelaria"
        optional
      />
      <TextField
        id={`${idPrefix}-street`}
        name="streetAddress"
        label="Street address"
        placeholder="Purok 3, Barangay Malabanban Norte"
        optional
      />
    </>
  );
}

/**
 * Provider fields. Each offers TESDA's usual wording as a `datalist` but
 * accepts anything typed — the vocabulary shifts between issuances, and a
 * school whose paperwork says something else must still be recordable.
 */
function SchoolProviderFields({ idPrefix }: { idPrefix: string }) {
  return (
    <>
      <TextField
        id={`${idPrefix}-provider-code`}
        name="tesdaProviderCode"
        label="TESDA provider code"
        placeholder="1263"
        optional
        hint="The number that appears inside the school's COPR numbers and batch RQM codes."
      />
      <TextField
        id={`${idPrefix}-school-type`}
        name="schoolType"
        label="School type"
        placeholder="Farm school"
        optional
        suggestions={SCHOOL_TYPE_SUGGESTIONS}
      />
      <TextField
        id={`${idPrefix}-provider-type`}
        name="providerType"
        label="Type of provider"
        placeholder="Private"
        optional
        suggestions={PROVIDER_TYPE_SUGGESTIONS}
      />
      <TextField
        id={`${idPrefix}-provider-class`}
        name="providerClassification"
        label="Classification of provider"
        placeholder="TVIs"
        optional
        suggestions={PROVIDER_CLASSIFICATION_SUGGESTIONS}
      />
    </>
  );
}

/**
 * One registered program.
 *
 * Field names repeat across rows on purpose: the Server Action reads them with
 * `formData.getAll()`, so the browser's own ordering pairs a qualification
 * with the COPR beside it without the form having to index anything.
 */
function ProgramRow({
  idPrefix,
  index,
  qualifications,
  error,
  canRemove,
  onRemove,
}: {
  idPrefix: string;
  index: number;
  qualifications: QualificationChoice[];
  error?: string;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const qualificationId = `${idPrefix}-qualification`;
  const coprId = `${idPrefix}-copr`;

  return (
    <div className="school-form-program">
      <div className="school-form-program-head">
        <span className="school-form-program-index">Program {index + 1}</span>
        {canRemove && (
          <button
            type="button"
            className="btn school-form-remove"
            onClick={onRemove}
            aria-label={`Remove program ${index + 1}`}
          >
            <Icon name="x" size={14} />
            Remove
          </button>
        )}
      </div>

      <label className="user-form-label" htmlFor={qualificationId}>
        Qualification
      </label>
      <select
        id={qualificationId}
        name="qualificationId"
        className="input"
        defaultValue=""
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${idPrefix}-error` : undefined}
      >
        <option value="">Choose a qualification</option>
        {qualifications.map((qualification) => (
          <option key={qualification.id} value={qualification.id}>
            {qualification.label}
          </option>
        ))}
      </select>

      <label className="user-form-label" htmlFor={coprId}>
        COPR number <span className="user-form-optional">optional</span>
      </label>
      <input
        id={coprId}
        name="coprNumber"
        type="text"
        className="input"
        autoComplete="off"
        placeholder="20221263AFFOAP212009-R"
      />
      <p className="user-form-hint">
        From the Certificate of Program Registration. Leave blank if the
        certificate has not been issued yet.
      </p>

      <SuggestionField
        id={`${idPrefix}-status`}
        name="registrationStatus"
        label="Registration status"
        placeholder="Registered"
        suggestions={REGISTRATION_STATUS_SUGGESTIONS}
      />
      <SuggestionField
        id={`${idPrefix}-mode`}
        name="deliveryMode"
        label="Delivery mode"
        placeholder="Institution-Based Training (IBT)"
        suggestions={DELIVERY_MODE_SUGGESTIONS}
      />

      {error && <FieldError id={`${idPrefix}-error`}>{error}</FieldError>}
    </div>
  );
}

/** A labelled text input with an optional suggestion list. */
function TextField({
  id,
  name,
  label,
  placeholder,
  optional,
  hint,
  suggestions,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  optional?: boolean;
  hint?: string;
  suggestions?: readonly string[];
}) {
  const listId = suggestions ? `${id}-list` : undefined;

  return (
    <div className="user-form-field">
      <label className="user-form-label" htmlFor={id}>
        {label} {optional && <span className="user-form-optional">optional</span>}
      </label>
      <input
        id={id}
        name={name}
        type="text"
        className="input"
        autoComplete="off"
        placeholder={placeholder}
        list={listId}
      />
      {suggestions && listId && <Suggestions id={listId} values={suggestions} />}
      {hint && <p className="user-form-hint">{hint}</p>}
    </div>
  );
}

/** The same, sized for a program row rather than a top-level field. */
function SuggestionField({
  id,
  name,
  label,
  placeholder,
  suggestions,
}: {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  suggestions: readonly string[];
}) {
  const listId = `${id}-list`;

  return (
    <>
      <label className="user-form-label" htmlFor={id}>
        {label} <span className="user-form-optional">optional</span>
      </label>
      <input
        id={id}
        name={name}
        type="text"
        className="input"
        autoComplete="off"
        placeholder={placeholder}
        list={listId}
      />
      <Suggestions id={listId} values={suggestions} />
    </>
  );
}

function Suggestions({ id, values }: { id: string; values: readonly string[] }) {
  return (
    <datalist id={id}>
      {values.map((value) => (
        <option key={value} value={value} />
      ))}
    </datalist>
  );
}

/**
 * A field-level message. `role="alert"` because it appears in response to the
 * operator's submit and names the input they must go back and fix; the icon
 * carries the same "this is a problem" signal as the colour.
 */
function FieldError({ id, children }: { id: string; children: string }) {
  return (
    <p className="user-form-error" id={id} role="alert">
      <Icon name="alert-circle" size={14} />
      <span>{children}</span>
    </p>
  );
}

export default CreateSchoolForm;
