'use client';

/**
 * Sign-up modal — replaces Clerk's prebuilt <SignUp> widget with markup that
 * matches the design handoff ("Sign Up Modal.dc.html"), driven directly by
 * Clerk's `useSignUp()` hook so we own the UI while Clerk owns the auth.
 *
 * Launched from the "No account? Sign up" link on the sign-in card, which owns
 * the `open` state and passes `onClose`. Three steps:
 *
 *   form   → signUp.create({ firstName, lastName, emailAddress, password })
 *            + prepareEmailAddressVerification({ strategy: 'email_code' })
 *   verify → attemptEmailAddressVerification({ code })
 *   done   → "Go to sign in" closes the modal back to the sign-in card.
 *
 * The done step deliberately does NOT activate the new session: per the
 * product flow, a registrar still has to assign the account's school and role,
 * so the copy sends the user back to sign in ("You can sign in now").
 *
 * Google OAuth goes through signUp.authenticateWithRedirect and returns via
 * the existing /sign-in/sso-callback handler (page.tsx), so it never reaches
 * the done step — the user lands on the dashboard already signed in.
 *
 * The optional invite-code field is behind the NEXT_PUBLIC_REQUIRE_INVITE_CODE
 * flag (default off) and is recorded on the Clerk user as unsafeMetadata.
 */

// `@clerk/nextjs/legacy` exposes the classic hook API (isLoaded / signUp.create
// → status / attemptEmailAddressVerification). Clerk v7's default `useSignUp`
// is the new experimental "signals" API with a different shape.
import { useSignUp } from '@clerk/nextjs/legacy';
import { IconCheck, IconEye, IconEyeOff, IconX } from '@tabler/icons-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';
import styles from './sign-up-modal.module.css';

const REQUIRE_INVITE_CODE = process.env.NEXT_PUBLIC_REQUIRE_INVITE_CODE === 'true';

type Step = 'form' | 'verify' | 'done';
type FieldKey = 'firstName' | 'lastName' | 'email' | 'password' | 'invite';

/** Clerk error param names → our field keys, for inline field errors. */
const PARAM_TO_FIELD: Record<string, FieldKey> = {
  first_name: 'firstName',
  last_name: 'lastName',
  email_address: 'email',
  password: 'password',
};

type ClerkErrorShape = {
  errors?: Array<{ longMessage?: string; message?: string; meta?: { paramName?: string } }>;
};

/** Pull the most user-friendly message out of a Clerk error. */
function clerkError(err: unknown): string {
  const e = err as ClerkErrorShape;
  return (
    e?.errors?.[0]?.longMessage ??
    e?.errors?.[0]?.message ??
    'Something went wrong. Please try again.'
  );
}

/** Split a Clerk error into per-field messages plus a general remainder. */
function splitClerkErrors(err: unknown): {
  fields: Partial<Record<FieldKey, string>>;
  general: string | null;
} {
  const e = err as ClerkErrorShape;
  if (!e?.errors?.length) return { fields: {}, general: clerkError(err) };
  const fields: Partial<Record<FieldKey, string>> = {};
  let general: string | null = null;
  for (const item of e.errors) {
    const field = item.meta?.paramName ? PARAM_TO_FIELD[item.meta.paramName] : undefined;
    const message = item.longMessage ?? item.message ?? 'Invalid value.';
    if (field && !fields[field]) fields[field] = message;
    else if (!general) general = message;
  }
  return { fields, general };
}

export function SignUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { isLoaded, signUp } = useSignUp();

  const [step, setStep] = useState<Step>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState(false);
  const [resent, setResent] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const codeRefs = useRef<Array<HTMLInputElement | null>>([]);

  // ── Modal behavior: scroll lock, Escape, focus trap ───────────────────────
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    // Move focus into the dialog when it opens or the step changes.
    const dialog = dialogRef.current;
    const first = dialog?.querySelector<HTMLElement>('input, button:not([aria-label="Close"])');
    first?.focus();
  }, [open, step]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusables = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;
      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;

  const disabled = !isLoaded || busy;

  // ── Form step: create the sign-up + send the email code ───────────────────
  function validateForm(): boolean {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!firstName.trim()) next.firstName = 'Enter your first name.';
    if (!lastName.trim()) next.lastName = 'Enter your last name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (password.length < 8 || !/\d/.test(password)) {
      next.password = 'Use 8+ characters with at least one number.';
    }
    if (REQUIRE_INVITE_CODE && !invite.trim()) {
      next.invite = 'Enter the invite code from your school administrator.';
    }
    setFieldErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmitForm(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    if (!validateForm()) return;
    setBusy(true);
    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim(),
        password,
        ...(REQUIRE_INVITE_CODE ? { unsafeMetadata: { inviteCode: invite.trim() } } : {}),
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setCode(['', '', '', '', '', '']);
      setCodeError(false);
      setResent(false);
      setStep('verify');
    } catch (err) {
      const { fields, general } = splitClerkErrors(err);
      setFieldErrors(fields);
      setError(general);
    } finally {
      setBusy(false);
    }
  }

  // ── Google OAuth ──────────────────────────────────────────────────────────
  async function handleGoogle() {
    if (!isLoaded || oauthBusy) return;
    setError(null);
    setOauthBusy(true);
    try {
      await signUp.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sign-in/sso-callback',
        redirectUrlComplete: '/dashboard',
      });
    } catch (err) {
      setError(clerkError(err));
      setOauthBusy(false);
    }
  }

  // ── Verify step: 6-digit code inputs ──────────────────────────────────────
  function setDigit(index: number, raw: string) {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setCode((prev) => {
      const next = prev.slice();
      next[index] = digit;
      return next;
    });
    setCodeError(false);
    if (digit && index < 5) codeRefs.current[index + 1]?.focus();
  }

  function handleCodeKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: ClipboardEvent<HTMLInputElement>) {
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = ['', '', '', '', '', ''];
    digits.split('').forEach((d, i) => {
      next[i] = d;
    });
    setCode(next);
    setCodeError(false);
    codeRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    if (code.some((c) => c === '')) {
      setCodeError(true);
      return;
    }
    setBusy(true);
    try {
      const res = await signUp.attemptEmailAddressVerification({ code: code.join('') });
      if (res.status === 'complete') {
        setStep('done');
        return;
      }
      setCodeError(true);
    } catch {
      setCodeError(true);
    } finally {
      setBusy(false);
    }
  }

  async function handleResend(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || resent) return;
    try {
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setResent(true);
    } catch (err) {
      setError(clerkError(err));
    }
  }

  function backToForm(e: FormEvent) {
    e.preventDefault();
    setCode(['', '', '', '', '', '']);
    setCodeError(false);
    setError(null);
    setStep('form');
  }

  const fieldProps = (key: FieldKey) =>
    fieldErrors[key]
      ? { className: `${styles.input} ${styles.inputInvalid}`, 'aria-invalid': true as const }
      : { className: styles.input };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.scroller}>
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label="Sign up"
          className={styles.dialog}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        >
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}>
            <IconX size={14} stroke={2} />
          </button>

          <img src="/assets/mark.svg" alt="" width={40} height={40} className={styles.mark} />

          {step === 'form' && (
            <>
              <h1 className={styles.title}>Create your account</h1>
              <p className={styles.sub}>Set up access to the Compliance &amp; Audit dashboard.</p>

              {error && <p className={styles.error} role="alert">{error}</p>}

              <button
                type="button"
                className={styles.oauth}
                onClick={handleGoogle}
                disabled={oauthBusy || !isLoaded}
              >
                <GoogleG />
                {oauthBusy ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <div className={styles.divider}><span>or</span></div>

              <form onSubmit={handleSubmitForm} noValidate>
                <div className={styles.nameGrid}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="su-first-name">First name</label>
                    <input
                      {...fieldProps('firstName')}
                      id="su-first-name"
                      type="text"
                      placeholder="Maria"
                      autoComplete="given-name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                    />
                    {fieldErrors.firstName && (
                      <span className={styles.fieldError}>{fieldErrors.firstName}</span>
                    )}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="su-last-name">Last name</label>
                    <input
                      {...fieldProps('lastName')}
                      id="su-last-name"
                      type="text"
                      placeholder="Santos"
                      autoComplete="family-name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                    />
                    {fieldErrors.lastName && (
                      <span className={styles.fieldError}>{fieldErrors.lastName}</span>
                    )}
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="su-email">Email address</label>
                  <input
                    {...fieldProps('email')}
                    id="su-email"
                    type="email"
                    placeholder="you@school.ph"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  {fieldErrors.email && (
                    <span className={styles.fieldError}>{fieldErrors.email}</span>
                  )}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="su-password">Password</label>
                  <div className={styles.pwWrap}>
                    <input
                      {...fieldProps('password')}
                      className={`${fieldProps('password').className} ${styles.pwInput}`}
                      id="su-password"
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className={styles.eye}
                      aria-label={showPw ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPw((v) => !v)}
                    >
                      {showPw ? <IconEyeOff size={14} stroke={2} /> : <IconEye size={14} stroke={2} />}
                    </button>
                  </div>
                  {fieldErrors.password ? (
                    <span className={styles.fieldError}>{fieldErrors.password}</span>
                  ) : (
                    <span className={styles.helper}>8+ characters, at least one number.</span>
                  )}
                </div>

                {REQUIRE_INVITE_CODE && (
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="su-invite">Invite code</label>
                    <input
                      {...fieldProps('invite')}
                      className={`${fieldProps('invite').className} ${styles.inviteInput}`}
                      id="su-invite"
                      type="text"
                      placeholder="TFS-NEG-XXXX"
                      autoComplete="off"
                      value={invite}
                      onChange={(e) => setInvite(e.target.value)}
                    />
                    {fieldErrors.invite ? (
                      <span className={styles.fieldError}>{fieldErrors.invite}</span>
                    ) : (
                      <span className={styles.helper}>Issued by your school administrator.</span>
                    )}
                  </div>
                )}

                {/* Clerk's smart bot protection renders its (usually invisible)
                    CAPTCHA challenge into this node during signUp.create(). */}
                <div id="clerk-captcha" />

                <button type="submit" className={styles.primary} disabled={disabled}>
                  {busy ? 'Creating account…' : 'Continue'}
                </button>
              </form>

              <p className={styles.switchLine}>
                Already have an account?{' '}
                <button type="button" className={styles.link} onClick={onClose}>Sign in</button>
              </p>
            </>
          )}

          {step === 'verify' && (
            <>
              <h1 className={styles.title}>Verify your email</h1>
              <p className={styles.sub}>
                Enter the 6-digit code sent to{' '}
                <span className={styles.emailEcho}>{email.trim() || 'you@school.ph'}</span>
              </p>

              {error && <p className={styles.error} role="alert">{error}</p>}

              <form onSubmit={handleVerify} noValidate>
                <div className={styles.codeRow}>
                  {code.map((value, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        codeRefs.current[i] = el;
                      }}
                      className={styles.codeInput}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      autoComplete={i === 0 ? 'one-time-code' : 'off'}
                      aria-label={`Digit ${i + 1}`}
                      value={value}
                      onChange={(e) => setDigit(i, e.target.value)}
                      onKeyDown={(e) => handleCodeKeyDown(i, e)}
                      onPaste={handleCodePaste}
                    />
                  ))}
                </div>

                {codeError && (
                  <p className={styles.codeError} role="alert">
                    Incorrect code — check the email and try again.
                  </p>
                )}

                <button type="submit" className={styles.primary} disabled={disabled}>
                  {busy ? 'Verifying…' : 'Verify'}
                </button>
              </form>

              <p className={styles.switchLine}>
                Didn&rsquo;t receive it?{' '}
                <button type="button" className={styles.link} onClick={handleResend}>
                  {resent ? 'Code re-sent' : 'Resend code'}
                </button>
              </p>
              <p className={styles.switchLine}>
                <button
                  type="button"
                  className={`${styles.link} ${styles.mutedLink}`}
                  onClick={backToForm}
                >
                  Use a different email
                </button>
              </p>
            </>
          )}

          {step === 'done' && (
            <div className={styles.doneWrap}>
              <span className={styles.doneCircle}>
                <IconCheck size={20} stroke={2} />
              </span>
              <h1 className={styles.doneTitle}>Account created</h1>
              <p className={styles.sub}>
                Your registrar will assign your school and role. You can sign in now.
              </p>
              <button type="button" className={styles.primary} onClick={onClose}>
                Go to sign in
              </button>
            </div>
          )}

          <div className={styles.footer}>
            <span>Secured by</span>
            <img src="/assets/clerk-logo.svg" alt="Clerk" width={40} height={12} />
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleG() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  );
}
