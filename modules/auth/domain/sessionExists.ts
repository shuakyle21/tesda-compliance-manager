/**
 * Detects Clerk's `session_exists` error: a sign-in attempt was started while
 * the browser already holds a valid session (e.g. another tab signed in).
 *
 * Clerk returns it as a 400 with `errors[].code`, either in the result object
 * or as a thrown error. The caller should send the user on to their
 * destination, not show the error. Pure (no I/O).
 */
export function isSessionExistsError(err: unknown): boolean {
  const e = err as { errors?: Array<{ code?: string }> } | null;
  return Boolean(e?.errors?.some((item) => item.code === 'session_exists'));
}
