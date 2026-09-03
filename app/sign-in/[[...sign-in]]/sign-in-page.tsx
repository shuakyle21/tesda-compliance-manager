"use client";

import { useAuth, useSignIn } from '@clerk/nextjs';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type SubmitEvent } from 'react';
import { SignUpModal } from '@/modules/auth/ui/SignUpModal';
import { startGoogleSignIn } from '@/modules/auth/domain/oauthSignIn';
import styles from './sign-in.module.css';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

function clerkError(err: unknown): string {
  const e = err as {
    clerkError?: true;
    longMessage?: string;
    message?: string;
    errors?: Array<{ longMessage?: string; message?: string }>;
  };
  // Only trust message text that actually came from Clerk — an arbitrary thrown
  // Error (e.g. a network failure) shouldn't have its raw .message shown to the user.
  if (e?.errors?.length) {
    return e.errors[0].longMessage ?? e.errors[0].message ?? 'Something went wrong. Please try again.';
  }
  if (e?.clerkError) {
    return e.longMessage ?? e.message ?? 'Something went wrong. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

export function SignInCard() {
  const { signIn, fetchStatus } = useSignIn();
  const { isLoaded } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const redirectUrl = params.get("redirect_url") || "/";

  const [view, setView] = useState<'signin' | 'forgot' | 'mfa' | 'trust'>('signin');
  // Sign-up modal state — owned here (the auth screen) per the handoff; the
  // /sign-up route deep-links into it via ?sign_up=1.
  const [signUpOpen, setSignUpOpen] = useState(params.get('sign_up') === '1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get("reason") === "auth-required"
      ? "Please sign in to continue."
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  // Shared by handleSignIn and confirmReset: both land here right after a
  // Clerk verification step succeeds (password auth / reset-password submit),
  // and both must resolve signIn.status the same way — finalize, hand off to
  // a second factor, hand off to a device-trust challenge, or bail with the
  // generic message. Was duplicated verbatim in both handlers; extracted so
  // there's one place to change this dance, not two kept in sync by hand.
  async function resolveAfterVerification() {
    if (signIn.status === 'complete') {
      const { error: finalizeError } = await signIn.finalize({
        navigate: ({ decorateUrl }) => router.push(decorateUrl(redirectUrl)),
      });
      if (finalizeError) setError(clerkError(finalizeError));
      return;
    }
    if (signIn.status === 'needs_second_factor') {
      setCode('');
      setUseBackup(false);
      setView('mfa');
      return;
    }
    if (signIn.status === 'needs_client_trust') {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) {
        setError(clerkError(sendError));
        return;
      }
      setCode('');
      setView('trust');
      return;
    }
    setError('Additional verification is required to finish signing in.');
  }

  // Email + password
  async function handleSignIn(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      // A prior attempt (this strategy or another, e.g. an abandoned Google
      // OAuth click) may have left an incomplete SignIn resource on the
      // client — it survives signOut() and page reloads since it's tied to
      // the client, not the session. Starting a brand-new attempt without
      // clearing it first can leave this one stuck too.
      if (signIn.status) signIn.reset();
      const { error: signInError } = await signIn.password({ emailAddress: email.trim(), password });
      if (signInError) {
        setError(clerkError(signInError));
        return;
      }
      await resolveAfterVerification();
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }

  // ── MFA (second factor) ────────────────────────────────────────────────────
  async function confirmMfa(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { error: mfaError } = useBackup
        ? await signIn.mfa.verifyBackupCode({ code: code.trim() })
        : await signIn.mfa.verifyTOTP({ code: code.trim() });
      if (mfaError) {
        setError(clerkError(mfaError));
        return;
      }
      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize({
          navigate: ({ decorateUrl }) => router.push(decorateUrl(redirectUrl)),
        });
        if (finalizeError) setError(clerkError(finalizeError));
        return;
      }
      setError('Could not verify the code. Please try again.');
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }

  // ── Device trust (new device, no MFA) ──────────────────────────────────────
  async function confirmTrust(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { error: verifyError } = await signIn.mfa.verifyEmailCode({ code: code.trim() });
      if (verifyError) {
        setError(clerkError(verifyError));
        return;
      }
      if (signIn.status === 'complete') {
        const { error: finalizeError } = await signIn.finalize({
          navigate: ({ decorateUrl }) => router.push(decorateUrl(redirectUrl)),
        });
        if (finalizeError) setError(clerkError(finalizeError));
        return;
      }
      setError('Could not verify this device. Please try again.');
    } catch (err) {
      setError(clerkError(err));
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
      const { error: ssoError } = await startGoogleSignIn(signIn, redirectUrl);
      if (ssoError) {
        setError(clerkError(ssoError));
        setOauthBusy(false);
      }
      // On success the browser is navigating away to the OAuth provider.
    } catch (err) {
      setError(clerkError(err));
      setOauthBusy(false);
    }
  }

  // ── Forgot password (reset code flow) ─────────────────────────────────────
  async function requestReset(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { error: createError } = await signIn.create({ identifier: email.trim() });
      if (createError) {
        setError(clerkError(createError));
        return;
      }
      const { error: sendError } = await signIn.resetPasswordEmailCode.sendCode();
      if (sendError) {
        setError(clerkError(sendError));
        return;
      }
      setResetSent(true);
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const { error: verifyError } = await signIn.resetPasswordEmailCode.verifyCode({ code: code.trim() });
      if (verifyError) {
        setError(clerkError(verifyError));
        return;
      }
      const { error: submitError } = await signIn.resetPasswordEmailCode.submitPassword({ password });
      if (submitError) {
        setError(clerkError(submitError));
        return;
      }
      // The password was already changed at this point — a non-"complete" status
      // from here on is the next step (e.g. MFA), not a failed reset.
      await resolveAfterVerification();
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }

  function handleUseDemo() {
    if (!DEMO_EMAIL) {
      setError(
        "Demo account is not configured. Set NEXT_PUBLIC_DEMO_EMAIL / NEXT_PUBLIC_DEMO_PASSWORD.",
      );
      return;
    }
    setError(null);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD ?? "");
  }

  const disabled = !isLoaded || fetchStatus === 'fetching' || busy;

  return (
    <div className={styles.card}>
      {/* Brand lockup — Claude Design e3ea69aa (TVI-CAMS.dc.html) sign-in hero
          image, shipped as public/assets/sign-in-brandmark.svg. Wider lockup
          than the Sidebar/Topbar mark, self-contained (no external assets). */}
      <Image
        src="/assets/sign-in-brandmark.svg"
        alt=""
        width={334}
        height={168}
        className={styles.mark}
      />

      {view === 'signin' && (
        <SignInView
          error={error}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          busy={busy}
          disabled={disabled}
          oauthBusy={oauthBusy}
          isLoaded={isLoaded}
          onSubmit={handleSignIn}
          onGoogle={handleGoogle}
          onForgot={() => {
            setError(null);
            setResetSent(false);
            setView('forgot');
          }}
          onUseDemo={handleUseDemo}
          onSignUp={() => setSignUpOpen(true)}
        />
      )}

      {view === 'mfa' && (
        <MfaView
          error={error}
          code={code}
          setCode={setCode}
          useBackup={useBackup}
          busy={busy}
          disabled={disabled}
          onSubmit={confirmMfa}
          onToggleBackup={() => {
            setError(null);
            setCode('');
            setUseBackup((v) => !v);
          }}
          onBack={() => {
            setError(null);
            setCode('');
            setView('signin');
          }}
        />
      )}

      {view === 'trust' && (
        <TrustView
          error={error}
          code={code}
          setCode={setCode}
          busy={busy}
          disabled={disabled}
          onSubmit={confirmTrust}
          onBack={() => {
            setError(null);
            setCode('');
            signIn.reset();
            setView('signin');
          }}
        />
      )}

      {view === 'forgot' && (
        <ForgotView
          error={error}
          resetSent={resetSent}
          email={email}
          setEmail={setEmail}
          code={code}
          setCode={setCode}
          password={password}
          setPassword={setPassword}
          busy={busy}
          disabled={disabled}
          onRequestReset={requestReset}
          onConfirmReset={confirmReset}
          onBack={() => {
            setError(null);
            setView('signin');
          }}
        />
      )}

      {/* "Secured by Clerk" badge — Figma node 743:2908. The prebuilt widget
          rendered this automatically; the custom card adds it back. */}
      <div className={styles.badge}>
        <span>Secured by</span>
        <Image
          src="/assets/clerk-logo.svg"
          alt="Clerk"
          width={37}
          height={11}
        />
      </div>

      {/* Sign-up modal — renders over the auth screen; closing (X, backdrop,
          Escape, or "Go to sign in") returns to this card. */}
      <SignUpModal open={signUpOpen} onClose={() => setSignUpOpen(false)} />
    </div>
  );
}

// ── View components ─────────────────────────────────────────────────────────
// Split out of SignInCard's render (was CC 26 — a single ternary chain over
// `view`) so each step's JSX and its own branches are independently
// measured. Bindings each step used to read from SignInCard's scope are
// passed as props; `tsc --noEmit` catches anything missed in the move.

interface SignInViewProps {
  error: string | null;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  disabled: boolean;
  oauthBusy: boolean;
  isLoaded: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onGoogle: () => void;
  onForgot: () => void;
  onUseDemo: () => void;
  onSignUp: () => void;
}

function SignInView({
  error,
  email,
  setEmail,
  password,
  setPassword,
  busy,
  disabled,
  oauthBusy,
  isLoaded,
  onSubmit,
  onGoogle,
  onForgot,
  onUseDemo,
  onSignUp,
}: SignInViewProps) {
  return (
    <>
      <h1 className={styles.title}>Sign in to TVI-CAMS</h1>
      <p className={styles.sub}>
        Welcome back. Sign in to continue to the Compliance &amp; Audit
        dashboard.
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className={styles.oauth}
        onClick={onGoogle}
        disabled={oauthBusy || !isLoaded}
      >
        <GoogleG />
        {oauthBusy ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className={styles.divider}>
        <span>or</span>
      </div>

      <form onSubmit={onSubmit}>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="email">
              Email address
            </label>
          </div>
          <input
            id="email"
            type="email"
            className={styles.input}
            placeholder="you@school.ph"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="password">
              Password
            </label>
            <button type="button" className={styles.forgot} onClick={onForgot}>
              Forgot password?
            </button>
          </div>
          <input
            id="password"
            type="password"
            className={`${styles.input} ${styles.mono}`}
            placeholder="••••••••"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className={styles.submit} disabled={disabled}>
          {busy ? "Signing in…" : "Continue"}
        </button>
      </form>

      <button
        type="button"
        className={styles.demo}
        onClick={onUseDemo}
        disabled={disabled}
      >
        <span>Use a demo account</span>
        <span aria-hidden="true">›</span>
      </button>

      <p className={styles.foot}>
        No account?{" "}
        <button type="button" className={styles.footLink} onClick={onSignUp}>
          Sign up
        </button>
      </p>
    </>
  );
}

interface MfaViewProps {
  error: string | null;
  code: string;
  setCode: (value: string) => void;
  useBackup: boolean;
  busy: boolean;
  disabled: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onToggleBackup: () => void;
  onBack: () => void;
}

function MfaView({
  error,
  code,
  setCode,
  useBackup,
  busy,
  disabled,
  onSubmit,
  onToggleBackup,
  onBack,
}: MfaViewProps) {
  return (
    <>
      <h1 className={styles.title}>Verify it&apos;s you</h1>
      <p className={styles.sub}>
        {useBackup
          ? 'Enter one of your unused backup codes.'
          : 'Enter the code from your authenticator app.'}
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <form onSubmit={onSubmit}>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="mfa-code">
              {useBackup ? 'Backup code' : 'Verification code'}
            </label>
          </div>
          <input
            id="mfa-code"
            inputMode={useBackup ? 'text' : 'numeric'}
            className={`${styles.input} ${styles.mono}`}
            placeholder={useBackup ? 'xxxxx-xxxxx' : '123456'}
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button type="submit" className={styles.submit} disabled={disabled}>
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      <button type="button" className={styles.forgot} onClick={onToggleBackup}>
        {useBackup ? 'Use authenticator app instead' : 'Use a backup code instead'}
      </button>

      <button type="button" className={styles.back} onClick={onBack}>
        ‹ Back to sign in
      </button>
    </>
  );
}

interface TrustViewProps {
  error: string | null;
  code: string;
  setCode: (value: string) => void;
  busy: boolean;
  disabled: boolean;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  onBack: () => void;
}

function TrustView({
  error,
  code,
  setCode,
  busy,
  disabled,
  onSubmit,
  onBack,
}: TrustViewProps) {
  return (
    <>
      <h1 className={styles.title}>Verify this device</h1>
      <p className={styles.sub}>
        For your security, enter the code we emailed you to confirm this
        sign-in.
      </p>

      {error && <p className={styles.error} role="alert">{error}</p>}

      <form onSubmit={onSubmit}>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="trust-code">
              Verification code
            </label>
          </div>
          <input
            id="trust-code"
            inputMode="numeric"
            className={`${styles.input} ${styles.mono}`}
            placeholder="123456"
            autoComplete="one-time-code"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </div>
        <button type="submit" className={styles.submit} disabled={disabled}>
          {busy ? 'Verifying…' : 'Verify'}
        </button>
      </form>

      <button type="button" className={styles.back} onClick={onBack}>
        ‹ Back to sign in
      </button>
    </>
  );
}

interface ForgotViewProps {
  error: string | null;
  resetSent: boolean;
  email: string;
  setEmail: (value: string) => void;
  code: string;
  setCode: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  busy: boolean;
  disabled: boolean;
  onRequestReset: (e: SubmitEvent<HTMLFormElement>) => void;
  onConfirmReset: (e: SubmitEvent<HTMLFormElement>) => void;
  onBack: () => void;
}

function ForgotView({
  error,
  resetSent,
  email,
  setEmail,
  code,
  setCode,
  password,
  setPassword,
  busy,
  disabled,
  onRequestReset,
  onConfirmReset,
  onBack,
}: ForgotViewProps) {
  return (
    <>
      <h1 className={styles.title}>Reset your password</h1>
      <p className={styles.sub}>
        {resetSent
          ? "Enter the code we emailed you and choose a new password."
          : "Enter your account email and we’ll send a reset code."}
      </p>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {!resetSent ? (
        <form onSubmit={onRequestReset}>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="reset-email">
                Email address
              </label>
            </div>
            <input
              id="reset-email"
              type="email"
              className={styles.input}
              placeholder="you@school.ph"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.submit} disabled={disabled}>
            {busy ? "Sending…" : "Send reset code"}
          </button>
        </form>
      ) : (
        <form onSubmit={onConfirmReset}>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="reset-code">
                Reset code
              </label>
            </div>
            <input
              id="reset-code"
              inputMode="numeric"
              className={`${styles.input} ${styles.mono}`}
              placeholder="123456"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label className={styles.label} htmlFor="new-password">
                New password
              </label>
            </div>
            <input
              id="new-password"
              type="password"
              className={`${styles.input} ${styles.mono}`}
              placeholder="••••••••"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.submit} disabled={disabled}>
            {busy ? "Updating…" : "Reset password & sign in"}
          </button>
        </form>
      )}

      <button type="button" className={styles.back} onClick={onBack}>
        ‹ Back to sign in
      </button>
    </>
  );
}

function GoogleG() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}
