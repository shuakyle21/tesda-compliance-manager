/**
 * Validates the post-sign-in redirect target taken from the `redirect_url`
 * query param.
 *
 * Only same-origin relative paths are allowed; anything else falls back to
 * "/". A cross-origin or scheme-bearing target after sign-in is an open
 * redirect — the user signs in and is sent to an attacker's site instead.
 *
 * Pure (no I/O) per RULES §2.14: the caller (the sign-in page) reads the
 * param, this function decides whether the value is safe to navigate to.
 */
export function sanitizeRedirectUrl(target: string | null): string {
  if (!target) return "/";
  const trimmed = target.trim();
  // Must be a same-origin path: one leading slash, not protocol-relative
  // ("//evil.com") which browsers resolve as a cross-origin origin.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/";
  // A backslash after the leading slash ("/\evil.com") is normalized to
  // "/" by browsers, turning it into a protocol-relative origin.
  if (trimmed.includes("\\")) return "/";
  // No URL scheme in the remainder ("https:", "javascript:", "data:", …).
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed.slice(1))) return "/";
  return trimmed;
}
