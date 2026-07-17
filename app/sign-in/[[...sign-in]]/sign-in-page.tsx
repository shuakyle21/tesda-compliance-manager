'use client';

/**
 * Custom sign-in card — replaces Clerk's prebuilt <SignIn> widget with markup
 * that matches the Figma "Auth · Sign-in" card (node 741:2459), driven directly
 * by Clerk's `useSignIn()` hook so we own the UI while Clerk owns the auth.
 *
 * Flows handled here:
 *   - Email + password   → signIn.create({ identifier, password }) → setActive
 *   - Google OAuth        → signIn.authenticateWithRedirect (callback in page.tsx)
 *   - Forgot password     → reset_password_email_code (request → verify → setActive)
 *   - Demo account        → prefills NEXT_PUBLIC_DEMO_* creds when configured
 *
 * Microsoft SSO is intentionally omitted (Google-only, per the TES-59 decision),
 * even though the Figma frame shows a Microsoft button.
 *
 * The route file (page.tsx) renders this inside `.auth-shell` and handles the
 * /sign-in/sso-callback sub-path that the Google redirect returns to.
 */

// `@clerk/nextjs/legacy` exposes the classic hook API (isLoaded / signIn.create
// → status / setActive / authenticateWithRedirect). Clerk v7's default
// `useSignIn` is the new experimental "signals" API with a different shape.
import { useSignIn } from '@clerk/nextjs/legacy';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { SignUpModal } from '@/modules/auth/ui/SignUpModal';
import styles from './sign-in.module.css';

const DEMO_EMAIL = process.env.NEXT_PUBLIC_DEMO_EMAIL;
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

/** Pull the most user-friendly message out of a Clerk error. */
function clerkError(err: unknown): string {
  const e = err as { errors?: Array<{ longMessage?: string; message?: string }> };
  return (
    e?.errors?.[0]?.longMessage ??
    e?.errors?.[0]?.message ??
    'Something went wrong. Please try again.'
  );
}

export function SignInCard() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const params = useSearchParams();
  const redirectUrl = params.get('redirect_url') || '/';

  const [view, setView] = useState<'signin' | 'forgot'>('signin');
  // Sign-up modal state — owned here (the auth screen) per the handoff; the
  // /sign-up route deep-links into it via ?sign_up=1.
  const [signUpOpen, setSignUpOpen] = useState(params.get('sign_up') === '1');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [error, setError] = useState<string | null>(
    params.get('reason') === 'auth-required' ? 'Please sign in to continue.' : null,
  );
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  // ── Email + password ──────────────────────────────────────────────────────
  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await signIn.create({ identifier: email.trim(), password });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      // e.g. needs_second_factor — not handled by this minimal card.
      setError('Additional verification is required to finish signing in.');
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
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sign-in/sso-callback',
        redirectUrlComplete: redirectUrl,
      });
    } catch (err) {
      setError(clerkError(err));
      setOauthBusy(false);
    }
  }

  // ── Forgot password (reset code flow) ─────────────────────────────────────
  async function requestReset(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      await signIn.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      setResetSent(true);
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset(e: FormEvent) {
    e.preventDefault();
    if (!isLoaded || busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await signIn.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password,
      });
      if (res.status === 'complete') {
        await setActive({ session: res.createdSessionId });
        router.push(redirectUrl);
        return;
      }
      setError('Could not reset the password. Please restart the process.');
    } catch (err) {
      setError(clerkError(err));
    } finally {
      setBusy(false);
    }
  }

  // ── Demo account ──────────────────────────────────────────────────────────
  function useDemo() {
    if (!DEMO_EMAIL) {
      setError('Demo account is not configured. Set NEXT_PUBLIC_DEMO_EMAIL / NEXT_PUBLIC_DEMO_PASSWORD.');
      return;
    }
    setError(null);
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD ?? '');
  }

  const disabled = !isLoaded || busy;

  return (
    <div className={styles.card}>
      {/* Full TVI-CAMS brand lockup — the recently-updated Sign-in design swaps
          the small 40x40 mark for the horizontal logotype (document-checklist
          mark + "TVI-CAMS" wordmark + "Compliance & Audit" tagline), rendered
          near the full card width at its native ~2:1 ratio. Decorative here:
          the same brand is announced by the "Sign in to TVI-CAMS" heading, so
          alt="" avoids a duplicate screen-reader announcement. */}
      <img src="/assets/tvi-cams-logo.svg" alt="" width={334} height={168} className={styles.logo} />

      {view === 'signin' ? (
        <>
          <h1 className={styles.title}>Sign in to TVI-CAMS</h1>
          <p className={styles.sub}>
            Welcome back. Sign in to continue to the Compliance &amp; Audit dashboard.
          </p>

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

          <form onSubmit={handleSignIn}>
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="email">Email address</label>
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
                <label className={styles.label} htmlFor="password">Password</label>
                <button
                  type="button"
                  className={styles.forgot}
                  onClick={() => { setError(null); setResetSent(false); setView('forgot'); }}
                >
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
              {busy ? 'Signing in…' : 'Continue'}
            </button>
          </form>

          <button type="button" className={styles.demo} onClick={useDemo} disabled={disabled}>
            <span>Use a demo account</span>
            <span aria-hidden="true">›</span>
          </button>

          <p className={styles.foot}>
            No account?{' '}
            <button
              type="button"
              className={styles.footLink}
              onClick={() => setSignUpOpen(true)}
            >
              Sign up
            </button>
          </p>
        </>
      ) : (
        // ── Forgot-password view ───────────────────────────────────────────
        <>
          <h1 className={styles.title}>Reset your password</h1>
          <p className={styles.sub}>
            {resetSent
              ? 'Enter the code we emailed you and choose a new password.'
              : 'Enter your account email and we’ll send a reset code.'}
          </p>

          {error && <p className={styles.error} role="alert">{error}</p>}

          {!resetSent ? (
            <form onSubmit={requestReset}>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="reset-email">Email address</label>
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
                {busy ? 'Sending…' : 'Send reset code'}
              </button>
            </form>
          ) : (
            <form onSubmit={confirmReset}>
              <div className={styles.field}>
                <div className={styles.labelRow}>
                  <label className={styles.label} htmlFor="reset-code">Reset code</label>
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
                  <label className={styles.label} htmlFor="new-password">New password</label>
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
                {busy ? 'Updating…' : 'Reset password & sign in'}
              </button>
            </form>
          )}

          <button
            type="button"
            className={styles.back}
            onClick={() => { setError(null); setView('signin'); }}
          >
            ‹ Back to sign in
          </button>
        </>
      )}

      {/* "Secured by Clerk" badge — Figma node 743:2908. The prebuilt widget
          rendered this automatically; the custom card adds it back. */}
      <div className={styles.badge}>
        <span>Secured by</span>
        <img src="/assets/clerk-logo.svg" alt="Clerk" width={37} height={11} />
      </div>

      {/* Sign-up modal — renders over the auth screen; closing (X, backdrop,
          Escape, or "Go to sign in") returns to this card. */}
      <SignUpModal open={signUpOpen} onClose={() => setSignUpOpen(false)} />
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
