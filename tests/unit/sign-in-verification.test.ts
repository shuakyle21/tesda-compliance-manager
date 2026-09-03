import type { ReactElement, SubmitEvent } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  useSignIn: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  useState: vi.fn(),
}));

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return { ...actual, useState: mocks.useState };
});

vi.mock('@clerk/nextjs', () => ({
  useAuth: mocks.useAuth,
  useSignIn: mocks.useSignIn,
}));

vi.mock('next/navigation', () => ({
  useRouter: mocks.useRouter,
  useSearchParams: mocks.useSearchParams,
}));

vi.mock('@/modules/auth/ui/SignUpModal', () => ({ SignUpModal: () => null }));

import { SignInCard } from '@/app/sign-in/[[...sign-in]]/sign-in-page';

type Setter = ReturnType<typeof vi.fn>;
type CardState = {
  setView: Setter;
  setCode: Setter;
  setUseBackup: Setter;
  setResetSent: Setter;
  setError: Setter;
};

type FakeSignIn = ReturnType<typeof makeSignIn>;

function isElement(value: unknown): value is ReactElement<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && 'type' in value && 'props' in value;
}

function elementsIn(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(elementsIn);
  if (!isElement(value)) return [];
  return [value, ...elementsIn(value.props.children)];
}

function cardChild(root: unknown, name: string): ReactElement<Record<string, unknown>> {
  const child = elementsIn(root).find(
    (element) => typeof element.type === 'function' && element.type.name === name,
  );
  expect(child, `expected SignInCard to render ${name}`).toBeDefined();
  return child!;
}

// ── The useState stub ───────────────────────────────────────────────────────
// SignInCard is exercised by calling it as a plain function with `useState`
// stubbed, so there is no renderer and no DOM. That makes the state slots
// positional: slot N is the Nth `useState` call in the component body. An
// inserted or removed `useState` would silently re-point every assertion
// below at the wrong piece of state, so `renderCard` verifies both the slot
// count and each slot's initial value and fails loudly instead.

const SLOTS = [
  'view',
  'signUpOpen',
  'email',
  'password',
  'code',
  'useBackup',
  'resetSent',
  'error',
  'busy',
  'oauthBusy',
] as const;

type Slot = (typeof SLOTS)[number];

// `error` is omitted: its initial value depends on the `reason` search param.
const INITIALS: Partial<Record<Slot, unknown>> = {
  view: 'signin',
  signUpOpen: false,
  email: '',
  password: '',
  code: '',
  useBackup: false,
  resetSent: false,
  busy: false,
  oauthBusy: false,
};

const OK = { error: undefined };

/**
 * A Clerk `signIn` stand-in whose `status` is a mutable field, mirroring the
 * real resource: the component reads `signIn.status` *after* awaiting a call,
 * so each method sets the status it leaves behind rather than the test fixing
 * a status up front. Every method exists even when a test does not use it —
 * a missing one would throw inside the handler's try/catch and be swallowed
 * into the generic error string, passing an assertion for the wrong reason.
 */
function makeSignIn(status: string | null = null) {
  return {
    status,
    reset: vi.fn(),
    password: vi.fn(async () => OK),
    finalize: vi.fn(async (_opts: { navigate: (arg: { decorateUrl: (u: string) => string }) => void }) => {
      _opts.navigate({ decorateUrl: (url) => `${url}?__decorated=1` });
      return OK;
    }),
    create: vi.fn(async () => OK),
    mfa: {
      sendEmailCode: vi.fn(async () => OK),
      verifyTOTP: vi.fn(async () => OK),
      verifyBackupCode: vi.fn(async () => OK),
      verifyEmailCode: vi.fn(async () => OK),
    },
    resetPasswordEmailCode: {
      sendCode: vi.fn(async () => OK),
      verifyCode: vi.fn(async () => OK),
      submitPassword: vi.fn(async () => OK),
    },
  };
}

/** Makes a stubbed call leave `status` behind, the way the real resource does. */
function leaves(signIn: FakeSignIn, status: string | null, error?: unknown) {
  return async () => {
    signIn.status = status;
    return { error } as { error: undefined };
  };
}

function renderCard(options: {
  signIn: FakeSignIn;
  /** Overrides for state slots — the component sees these as current values. */
  state?: Partial<Record<Slot, unknown>>;
  searchParams?: string;
  isLoaded?: boolean;
}) {
  const { signIn, state = {}, searchParams = '', isLoaded = true } = options;
  const setters = new Map<Slot, Setter>();
  const initials: unknown[] = [];
  const push = vi.fn();

  let slot = 0;
  mocks.useState.mockImplementation((initial: unknown) => {
    const name = SLOTS[slot++];
    initials.push(initial);
    const setter = vi.fn();
    if (name) setters.set(name, setter);
    return [name && name in state ? state[name] : initial, setter];
  });
  mocks.useAuth.mockReturnValue({ isLoaded });
  mocks.useSignIn.mockReturnValue({ signIn, fetchStatus: 'idle' });
  mocks.useRouter.mockReturnValue({ push });
  mocks.useSearchParams.mockReturnValue(new URLSearchParams(searchParams));

  const root = SignInCard();

  expect(
    initials.length,
    `SignInCard now calls useState ${initials.length} times, not ${SLOTS.length}; update SLOTS`,
  ).toBe(SLOTS.length);
  for (const [index, name] of SLOTS.entries()) {
    if (!(name in INITIALS)) continue;
    expect(
      initials[index],
      `useState slot ${index} no longer looks like "${name}"; the state order changed`,
    ).toEqual(INITIALS[name]);
  }

  const cardState: CardState = {
    setView: setters.get('view')!,
    setCode: setters.get('code')!,
    setUseBackup: setters.get('useBackup')!,
    setResetSent: setters.get('resetSent')!,
    setError: setters.get('error')!,
  };

  return { root, state: cardState, push, initials };
}

type Handler = (e: SubmitEvent<HTMLFormElement>) => Promise<void>;

/** Pulls a submit handler off a rendered view and calls it with a stub event. */
function submit(view: ReactElement<Record<string, unknown>>, prop = 'onSubmit') {
  const handler = view.props[prop] as unknown as Handler;
  const event = { preventDefault: vi.fn() } as unknown as SubmitEvent<HTMLFormElement>;
  return handler(event);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Password sign-in: which verification step comes next ────────────────────

describe('handleSignIn', () => {
  it('moves to the MFA step when Clerk asks for a second factor', async () => {
    const signIn = makeSignIn();
    signIn.password.mockImplementation(leaves(signIn, 'needs_second_factor'));

    const { root, state } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    expect(state.setView).toHaveBeenCalledWith('mfa');
    // The code box is cleared and reset to the authenticator variant so a
    // stale code or backup-code toggle never carries into the new step.
    expect(state.setCode).toHaveBeenCalledWith('');
    expect(state.setUseBackup).toHaveBeenCalledWith(false);
    expect(signIn.finalize).not.toHaveBeenCalled();
  });

  it('emails a device-trust code and moves to the trust step', async () => {
    const signIn = makeSignIn();
    signIn.password.mockImplementation(leaves(signIn, 'needs_client_trust'));

    const { root, state } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    expect(signIn.mfa.sendEmailCode).toHaveBeenCalled();
    expect(state.setView).toHaveBeenCalledWith('trust');
  });

  it('stays put when the device-trust email fails to send', async () => {
    const signIn = makeSignIn();
    signIn.password.mockImplementation(leaves(signIn, 'needs_client_trust'));
    signIn.mfa.sendEmailCode.mockResolvedValue({
      error: { clerkError: true, longMessage: 'Email could not be sent.' },
    } as never);

    const { root, state } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    // Showing the code box for a code that was never sent would strand the user.
    expect(state.setView).not.toHaveBeenCalledWith('trust');
    expect(state.setError).toHaveBeenCalledWith('Email could not be sent.');
  });

  it('finalizes to the decorated redirect target when sign-in completes', async () => {
    const signIn = makeSignIn();
    signIn.password.mockImplementation(leaves(signIn, 'complete'));

    const { root, push } = renderCard({ signIn, searchParams: 'redirect_url=/batches' });
    await submit(cardChild(root, 'SignInView'));

    expect(signIn.finalize).toHaveBeenCalled();
    // Clerk's decorateUrl must wrap the target — pushing the bare URL would
    // drop the handshake params and bounce the user back to sign-in.
    expect(push).toHaveBeenCalledWith('/batches?__decorated=1');
  });

  it('clears a stale sign-in attempt before starting a new one', async () => {
    const signIn = makeSignIn('needs_client_trust');
    signIn.password.mockImplementation(leaves(signIn, 'complete'));

    const { root } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    expect(signIn.reset).toHaveBeenCalled();
  });

  it('does not reset when there is no attempt in flight', async () => {
    const signIn = makeSignIn(null);
    signIn.password.mockImplementation(leaves(signIn, 'complete'));

    const { root } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    expect(signIn.reset).not.toHaveBeenCalled();
  });
});

// ── Second factor ───────────────────────────────────────────────────────────

describe('confirmMfa', () => {
  it('verifies a TOTP code against the authenticator strategy', async () => {
    const signIn = makeSignIn('needs_second_factor');
    signIn.mfa.verifyTOTP.mockImplementation(leaves(signIn, 'complete'));

    const { root, push } = renderCard({
      signIn,
      state: { view: 'mfa', code: ' 123456 ', useBackup: false },
    });
    await submit(cardChild(root, 'MfaView'));

    expect(signIn.mfa.verifyTOTP).toHaveBeenCalledWith({ code: '123456' });
    expect(signIn.mfa.verifyBackupCode).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/?__decorated=1');
  });

  it('verifies against the backup-code strategy when that toggle is on', async () => {
    const signIn = makeSignIn('needs_second_factor');
    signIn.mfa.verifyBackupCode.mockImplementation(leaves(signIn, 'complete'));

    const { root } = renderCard({
      signIn,
      state: { view: 'mfa', code: 'abcde-fghij', useBackup: true },
    });
    await submit(cardChild(root, 'MfaView'));

    expect(signIn.mfa.verifyBackupCode).toHaveBeenCalledWith({ code: 'abcde-fghij' });
    expect(signIn.mfa.verifyTOTP).not.toHaveBeenCalled();
  });

  it('reports a failure when the code verifies but sign-in is still incomplete', async () => {
    const signIn = makeSignIn('needs_second_factor');
    signIn.mfa.verifyTOTP.mockImplementation(leaves(signIn, 'needs_second_factor'));

    const { root, state } = renderCard({ signIn, state: { view: 'mfa', code: '000000' } });
    await submit(cardChild(root, 'MfaView'));

    expect(state.setError).toHaveBeenCalledWith('Could not verify the code. Please try again.');
  });
});

// ── Device trust ────────────────────────────────────────────────────────────

describe('confirmTrust', () => {
  it('verifies the emailed code and finalizes', async () => {
    const signIn = makeSignIn('needs_client_trust');
    signIn.mfa.verifyEmailCode.mockImplementation(leaves(signIn, 'complete'));

    const { root, push } = renderCard({ signIn, state: { view: 'trust', code: '654321' } });
    await submit(cardChild(root, 'TrustView'));

    expect(signIn.mfa.verifyEmailCode).toHaveBeenCalledWith({ code: '654321' });
    expect(push).toHaveBeenCalledWith('/?__decorated=1');
  });

  it('abandons the half-finished attempt when backing out of the trust step', () => {
    const signIn = makeSignIn('needs_client_trust');

    const { root, state } = renderCard({ signIn, state: { view: 'trust' } });
    (cardChild(root, 'TrustView').props.onBack as () => void)();

    // Unlike the other views' back buttons, this one must reset: the attempt
    // is mid-verification, and leaving it in place jams the next sign-in.
    expect(signIn.reset).toHaveBeenCalled();
    expect(state.setView).toHaveBeenCalledWith('signin');
  });
});

// ── Password reset ──────────────────────────────────────────────────────────

describe('confirmReset', () => {
  it('treats a second-factor prompt after the reset as the next step, not a failure', async () => {
    const signIn = makeSignIn();
    signIn.resetPasswordEmailCode.submitPassword.mockImplementation(
      leaves(signIn, 'needs_second_factor'),
    );

    const { root, state } = renderCard({
      signIn,
      state: { view: 'forgot', resetSent: true, code: '123456', password: 'new-password' },
    });
    await submit(cardChild(root, 'ForgotView'), 'onConfirmReset');

    // The password has already been changed by this point. Reporting an error
    // here would tell the user their reset failed when it actually succeeded.
    expect(state.setView).toHaveBeenCalledWith('mfa');
    expect(state.setError).not.toHaveBeenCalledWith(
      'Additional verification is required to finish signing in.',
    );
  });

  it('emails a device-trust code when the reset needs one, rather than erroring', async () => {
    const signIn = makeSignIn();
    signIn.resetPasswordEmailCode.submitPassword.mockImplementation(
      leaves(signIn, 'needs_client_trust'),
    );

    const { root, state } = renderCard({
      signIn,
      state: { view: 'forgot', resetSent: true, code: '123456', password: 'new-password' },
    });
    await submit(cardChild(root, 'ForgotView'), 'onConfirmReset');

    expect(signIn.mfa.sendEmailCode).toHaveBeenCalled();
    expect(state.setView).toHaveBeenCalledWith('trust');
    expect(state.setError).not.toHaveBeenCalledWith(
      'Additional verification is required to finish signing in.',
    );
  });

  it('sends a reset code for the entered email', async () => {
    const signIn = makeSignIn();

    const { root } = renderCard({
      signIn,
      state: { view: 'forgot', resetSent: false, email: ' coordinator@school.ph ' },
    });
    await submit(cardChild(root, 'ForgotView'), 'onRequestReset');

    expect(signIn.create).toHaveBeenCalledWith({ identifier: 'coordinator@school.ph' });
    expect(signIn.resetPasswordEmailCode.sendCode).toHaveBeenCalled();
  });

  it('does not ask for a code that was never sent when the email is unknown', async () => {
    const signIn = makeSignIn();
    signIn.create.mockResolvedValue({
      error: { errors: [{ longMessage: "Couldn't find your account." }] },
    } as never);

    const { root, state } = renderCard({
      signIn,
      state: { view: 'forgot', resetSent: false, email: 'nobody@school.ph' },
    });
    await submit(cardChild(root, 'ForgotView'), 'onRequestReset');

    expect(signIn.resetPasswordEmailCode.sendCode).not.toHaveBeenCalled();
    expect(state.setResetSent).not.toHaveBeenCalled();
    expect(state.setError).toHaveBeenCalledWith("Couldn't find your account.");
  });

  it('does not advance to the code form when the reset email fails to send', async () => {
    const signIn = makeSignIn();
    signIn.resetPasswordEmailCode.sendCode.mockResolvedValue({
      error: { clerkError: true, longMessage: 'Too many requests.' },
    } as never);

    const { root, state } = renderCard({
      signIn,
      state: { view: 'forgot', resetSent: false, email: 'coordinator@school.ph' },
    });
    await submit(cardChild(root, 'ForgotView'), 'onRequestReset');

    expect(state.setResetSent).not.toHaveBeenCalled();
    expect(state.setError).toHaveBeenCalledWith('Too many requests.');
  });
});

// ── Error shaping ───────────────────────────────────────────────────────────
// RULES.md: internal errors must never reach the UI. Only text Clerk itself
// produced is shown; anything else collapses to the generic message.

describe('error messages shown to the user', () => {
  const GENERIC = 'Something went wrong. Please try again.';

  it('never shows the message of a non-Clerk error', async () => {
    const signIn = makeSignIn();
    signIn.password.mockRejectedValue(new Error('ECONNREFUSED db.internal:5432'));

    const { root, state } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    expect(state.setError).toHaveBeenCalledWith(GENERIC);
    expect(state.setError).not.toHaveBeenCalledWith(expect.stringContaining('db.internal'));
  });

  it('shows the long message from a Clerk error array', async () => {
    const signIn = makeSignIn();
    signIn.password.mockResolvedValue({
      error: { errors: [{ longMessage: 'Password is incorrect.', message: 'incorrect' }] },
    } as never);

    const { root, state } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    expect(state.setError).toHaveBeenCalledWith('Password is incorrect.');
  });

  it('falls back to the flagged Clerk error message when there is no array', async () => {
    const signIn = makeSignIn();
    signIn.password.mockResolvedValue({
      error: { clerkError: true, longMessage: 'That account is locked.' },
    } as never);

    const { root, state } = renderCard({ signIn });
    await submit(cardChild(root, 'SignInView'));

    expect(state.setError).toHaveBeenCalledWith('That account is locked.');
  });

  it('explains why the user landed here when the proxy required auth', () => {
    const { initials } = renderCard({
      signIn: makeSignIn(),
      searchParams: 'reason=auth-required',
    });

    expect(initials[SLOTS.indexOf('error')]).toBe('Please sign in to continue.');
  });
});
