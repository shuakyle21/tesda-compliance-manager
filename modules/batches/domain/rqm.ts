/**
 * Displayed batch identity. The RQM code (from the Notice to Proceed) is the
 * batch's official ID; until it is recorded we fall back to the internal batch
 * code. Display only — keys, URLs and lookups keep using `Batch.id`.
 */

import type { Batch } from '@/shared/types';

export function displayBatchId(b: Pick<Batch, 'id' | 'rqmCode'>): string {
  return b.rqmCode ?? b.id;
}

// ---------------------------------------------------------------------------
// Entering and finding RQM codes. Pure — no I/O.
// ---------------------------------------------------------------------------

/** tranche - year - program - provider - sequence, e.g. RQM3-2026-CFSP-0000-0001 */
export const RQM_CODE_PATTERN = /^RQM\d+-\d{4}-[A-Z]+-\d+-\d+$/;
export const RQM_CODE_MAX_LENGTH = 64;

/** Four parts: the NTP's request number, not a batch code. */
const RQM_REQUEST_NUMBER_PATTERN = /^RQM\d+-\d{4}-[A-Z]+-\d+$/;

// U+2010 hyphen, U+2011 non-breaking hyphen, U+2012 figure dash, U+2013 en dash,
// U+2014 em dash, U+2212 minus. A real NTP prints codes with U+2010.
const UNICODE_DASHES = /[‐-—−]/g;

/** Upper-cases, folds Unicode dashes to `-`, drops soft hyphens and all whitespace (incl. NBSP). */
export function normalizeRqmCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/­/g, '')
    .replace(UNICODE_DASHES, '-')
    .replace(/\s+/g, '');
}

export type RqmCheck =
  | { ok: true; code: string; warnings: string[] }
  | { ok: false; error: string };

export function checkRqmCode(
  input: string,
  ctx: { program: string; providerCode: string | null },
): RqmCheck {
  const code = normalizeRqmCode(input);
  if (!code) return { ok: false, error: 'Enter the RQM code from the Notice to Proceed.' };
  if (RQM_REQUEST_NUMBER_PATTERN.test(code)) {
    return { ok: false, error: 'That is the request number. Use the RQM code from the table row, which has five parts.' };
  }
  if (code.length > RQM_CODE_MAX_LENGTH || !RQM_CODE_PATTERN.test(code)) {
    return { ok: false, error: "That doesn't look like an RQM code. It should look like RQM3-2026-CFSP-0000-0001." };
  }

  const [, , program, provider] = code.split('-');
  const warnings: string[] = [];
  const batchProgram = ctx.program.trim().toUpperCase();
  if (batchProgram && program !== batchProgram) {
    warnings.push(`The code's program (${program}) differs from this batch's program (${batchProgram}).`);
  }
  const providerCode = ctx.providerCode?.trim();
  if (providerCode && provider !== providerCode) {
    warnings.push(`The code's provider number (${provider}) differs from this school's TESDA provider code (${providerCode}).`);
  }
  return { ok: true, code, warnings };
}

/**
 * Normalized five-part codes anywhere in free text, de-duplicated, in order of
 * first appearance. Four-part request numbers are never returned. Folds dashes
 * but, unlike `normalizeRqmCode`, keeps whitespace so neighbouring words survive.
 */
export function findRqmCodes(text: string): string[] {
  const folded = text.toUpperCase().replace(/­/g, '').replace(UNICODE_DASHES, '-');
  // Lookarounds: not glued to a longer token, and not the prefix of a six-part value.
  const matches = folded.matchAll(/(?<![A-Z0-9-])RQM\d+-\d{4}-[A-Z]+-\d+-\d+(?!-?\d)/g);
  return [...new Set([...matches].map((m) => m[0]))];
}

/** What the set-RQM-code action hands back to `RqmCodeEditor`. Types only. */
export type RqmFormState =
  | { status: 'idle' }
  | { status: 'saved'; code: string | null; warnings: string[]; logFailed: boolean }
  /** The input is the problem — fix it and resubmit. */
  | { status: 'invalid'; message: string }
  | { status: 'error'; message: string }
  | { status: 'denied' };
