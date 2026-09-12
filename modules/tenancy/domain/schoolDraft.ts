/**
 * School-registration rules (FR-02, ADR-006) — pure, no I/O.
 *
 * The "add school" form's whole contract: what a school record must carry,
 * which TESDA vocabularies the form suggests, and how a raw form payload
 * becomes a validated command. Kept out of `data/` and `ui/` so the rules are
 * unit-testable without Supabase or React, and so the Server Action and the
 * client form enforce exactly the same thing rather than drifting apart.
 *
 * Mirrors `./userAccess.ts` deliberately — same draft → command → field-error
 * shape — so the two write paths in this module read the same way.
 *
 * Validation here is a usability contract, not a security one. Postgres RLS
 * (migration 20260906114735) decides who may actually create a school.
 */

/**
 * TESDA vocabularies, offered as suggestions and never as a closed set.
 *
 * These are the exact literals `modules/reports/ui/exportXlsx.ts` currently
 * hardcodes into the T2MIS workbook. Making them data rather than constants is
 * the point of this screen: they are right for the three seeded schools and
 * wrong for any fourth. They stay free text because TESDA's provider and
 * delivery vocabularies shift between issuances, and a school whose paperwork
 * says something not on this list must still be recordable — the form must
 * describe reality, not overrule it.
 */
export const PROVIDER_TYPE_SUGGESTIONS = ['Private', 'Public'] as const;

export const PROVIDER_CLASSIFICATION_SUGGESTIONS = [
  'TVIs',
  'Farm School',
  'Higher Education Institution',
  'Local Government Unit',
  'NGO',
  'Enterprise',
] as const;

export const SCHOOL_TYPE_SUGGESTIONS = [
  'Technical-vocational institute',
  'Farm school',
  'Rice-based farm school',
] as const;

export const REGISTRATION_STATUS_SUGGESTIONS = [
  'Registered',
  'WTR',
  'Pending',
] as const;

export const DELIVERY_MODE_SUGGESTIONS = [
  'Institution-Based Training (IBT)',
  'Community-Based Training (CBT)',
  'Enterprise-Based Training (EBT)',
] as const;

// ---------------------------------------------------------------------------
// Draft and command shapes
// ---------------------------------------------------------------------------

/** One registered program row as the form submitted it. */
export interface SchoolProgramDraft {
  qualificationId: unknown;
  coprNumber: unknown;
  registrationStatus: unknown;
  deliveryMode: unknown;
}

/** A form submission before validation — every field is whatever the form sent. */
export interface SchoolDraft {
  code: unknown;
  name: unknown;
  region: unknown;
  schoolType: unknown;
  tesdaProviderCode: unknown;
  province: unknown;
  cityMunicipality: unknown;
  streetAddress: unknown;
  providerType: unknown;
  providerClassification: unknown;
  programs: readonly SchoolProgramDraft[];
}

/** One validated program row, safe to hand to the data layer. */
export interface SchoolProgramCommand {
  qualificationId: string;
  coprNumber: string | null;
  registrationStatus: string | null;
  deliveryMode: string | null;
}

/** A validated command, safe to hand to the data layer. */
export interface SchoolCommand {
  code: string;
  name: string;
  region: string | null;
  schoolType: string | null;
  tesdaProviderCode: string | null;
  province: string | null;
  cityMunicipality: string | null;
  streetAddress: string | null;
  providerType: string | null;
  providerClassification: string | null;
  programs: SchoolProgramCommand[];
}

/** Scalar fields the form can render an error against, one message each. */
type SchoolScalarField = Exclude<keyof SchoolDraft, 'programs'>;

/**
 * Field-keyed messages.
 *
 * `programs` carries a message about the list as a whole ("add at least one");
 * `programRows` carries one message per row index, so a duplicate or empty row
 * is flagged where the operator can see it rather than at the top of the form.
 */
export interface SchoolFieldErrors extends Partial<Record<SchoolScalarField, string>> {
  programs?: string;
  programRows?: Record<number, string>;
}

export type SchoolValidation =
  | { ok: true; command: SchoolCommand }
  | { ok: false; errors: SchoolFieldErrors };

// ---------------------------------------------------------------------------
// Normalizers
// ---------------------------------------------------------------------------

function asTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Empty becomes null, never `''` — one representation of "not recorded". */
function orNull(value: string): string | null {
  return value || null;
}

/**
 * Uppercases and strips the school code.
 *
 * `tenants.code` is unique and appears in UI chrome as the school's short
 * name (AKB, J3ED, NEN). Accepting `akb` alongside `AKB` would create two
 * schools that read as one, and the unique constraint would not catch it.
 */
export function normalizeSchoolCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Letters and digits only, 2–12 characters — it is a label, not a sentence. */
const SCHOOL_CODE_SHAPE = /^[A-Z0-9]{2,12}$/;

/** TESDA provider numbers are numeric, e.g. 1263. */
const PROVIDER_CODE_SHAPE = /^\d{1,10}$/;

/**
 * Validates every program row, keying each message by its **draft** index.
 *
 * The allowed-id check lives in here rather than in the caller on purpose.
 * `rows` is compacted -- blank rows and duplicates never reach it -- so an
 * index into `rows` does not address the same row the form rendered. Checking
 * out here against `rows.findIndex` therefore filed the message against the
 * wrong input (and reported only the first offender). Inside this loop the
 * draft index is the one the form uses, so it is the only place the check is
 * correct.
 */
function validatePrograms(
  drafts: readonly SchoolProgramDraft[],
  allowedQualificationIds: readonly string[],
): { rows: SchoolProgramCommand[]; message?: string; rowErrors: Record<number, string> } {
  const rows: SchoolProgramCommand[] = [];
  const rowErrors: Record<number, string> = {};
  const seen = new Set<string>();

  drafts.forEach((draft, index) => {
    const qualificationId = asTrimmedString(draft.qualificationId);

    // A wholly blank row is the operator leaving a spare input alone, not an
    // error. Skip it silently; the "at least one" check below still applies.
    const hasAnything =
      qualificationId ||
      asTrimmedString(draft.coprNumber) ||
      asTrimmedString(draft.registrationStatus) ||
      asTrimmedString(draft.deliveryMode);
    if (!hasAnything) return;

    if (!qualificationId) {
      rowErrors[index] = 'Choose a qualification for this program.';
      return;
    }

    // The unique constraint on (tenant_id, qualification_id) would reject this
    // with a message nobody can act on. Say it in the operator's terms, next
    // to the row that caused it.
    if (seen.has(qualificationId)) {
      rowErrors[index] = 'This qualification is already listed. Remove the duplicate.';
      return;
    }

    // Turns a foreign-key failure into something the operator can act on.
    if (!allowedQualificationIds.includes(qualificationId)) {
      rowErrors[index] = 'Choose a qualification from the list.';
      return;
    }

    seen.add(qualificationId);

    rows.push({
      qualificationId,
      coprNumber: orNull(asTrimmedString(draft.coprNumber)),
      registrationStatus: orNull(asTrimmedString(draft.registrationStatus)),
      deliveryMode: orNull(asTrimmedString(draft.deliveryMode)),
    });
  });

  // A school with no registered program cannot legally run a batch, so an
  // empty list is a data-entry mistake rather than a valid state to save.
  const message =
    rows.length === 0 && Object.keys(rowErrors).length === 0
      ? 'Add at least one registered program.'
      : undefined;

  return { rows, message, rowErrors };
}

/**
 * Validates a raw form payload against the qualifications on offer.
 *
 * `allowedQualificationIds` is passed in rather than fetched because this file
 * is pure. It matters: without it a submitted id would reach the insert and
 * fail on the foreign key, and the operator would see a generic failure
 * instead of "choose a qualification from the list". Every message is phrased
 * for the person at the desk, and none leaks a table name or an internal id.
 *
 * COPR numbers are NOT shape-checked. The format varies by issuing year and
 * region office, and rejecting a number that is printed on a real certificate
 * would make the screen unusable for exactly the school it is meant to
 * onboard. It is recorded as typed.
 */
export function validateSchoolDraft(
  draft: SchoolDraft,
  allowedQualificationIds: readonly string[],
): SchoolValidation {
  const errors: SchoolFieldErrors = {};

  const code = normalizeSchoolCode(asTrimmedString(draft.code));
  const name = asTrimmedString(draft.name);
  const tesdaProviderCode = asTrimmedString(draft.tesdaProviderCode);

  if (!code) {
    errors.code = 'Enter a short school code, for example AKB.';
  } else if (!SCHOOL_CODE_SHAPE.test(code)) {
    errors.code = 'Use 2 to 12 letters or numbers, with no spaces or punctuation.';
  }

  if (!name) {
    errors.name = 'Enter the school name.';
  }

  if (tesdaProviderCode && !PROVIDER_CODE_SHAPE.test(tesdaProviderCode)) {
    errors.tesdaProviderCode = 'Enter numbers only, for example 1263.';
  }

  const { rows, message, rowErrors } = validatePrograms(draft.programs, allowedQualificationIds);

  if (message) errors.programs = message;
  if (Object.keys(rowErrors).length > 0) errors.programRows = rowErrors;

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    command: {
      code,
      name,
      region: orNull(asTrimmedString(draft.region)),
      schoolType: orNull(asTrimmedString(draft.schoolType)),
      tesdaProviderCode: orNull(tesdaProviderCode),
      province: orNull(asTrimmedString(draft.province)),
      cityMunicipality: orNull(asTrimmedString(draft.cityMunicipality)),
      streetAddress: orNull(asTrimmedString(draft.streetAddress)),
      providerType: orNull(asTrimmedString(draft.providerType)),
      providerClassification: orNull(asTrimmedString(draft.providerClassification)),
      programs: rows,
    },
  };
}

// ---------------------------------------------------------------------------
// Form state — the contract between the Server Action and the client form.
// ---------------------------------------------------------------------------

/**
 * What the create-school Server Action reports back.
 *
 * Declared here, in `domain/`, rather than beside the action in `app/`,
 * because `modules/tenancy/ui` needs the type and the import direction runs
 * `app -> modules -> shared` — UI may not reach into a route. The page passes
 * the action down as a prop typed by `CreateSchoolAction` below.
 *
 * `duplicate-code` is kept distinct from `failed` because it is the one
 * failure the operator can fix themselves: the school already exists, or the
 * code is taken by another school. Collapsing it into a generic error would
 * send them to a developer for a typo.
 */
export type CreateSchoolFormState =
  | { status: 'idle' }
  | { status: 'invalid'; errors: SchoolFieldErrors }
  | { status: 'created'; tenantId: string; name: string; code: string; programCount: number }
  | { status: 'duplicate-code'; code: string }
  | { status: 'denied' }
  | { status: 'unconfigured' }
  | { status: 'failed' };

export const IDLE_CREATE_SCHOOL_STATE: CreateSchoolFormState = { status: 'idle' };

/** Signature of the Server Action, shaped for React's `useActionState`. */
export type CreateSchoolAction = (
  previous: CreateSchoolFormState,
  formData: FormData,
) => Promise<CreateSchoolFormState>;
