import { NextResponse } from 'next/server';
import { createSupabaseServerClient, isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * Manual proof-of-chain for the Clerk → Supabase → RLS path.
 *
 * DEV ONLY. Returns 404 in production. This endpoint reports why the chain
 * failed, which is exactly the detail that must never reach a real UI — see
 * RULES.md on not leaking Supabase errors. Delete it, or leave it gated, but
 * never relax the production guard.
 *
 * It deliberately selects `id` from `profiles` and nothing else. The point is
 * to learn whether the token validates and whether a profile row exists — not
 * to read data. The token itself is never logged or returned.
 *
 * Visit /api/debug/auth-check while signed in.
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      verdict: 'unconfigured',
      meaning: 'NEXT_PUBLIC_SUPABASE_URL or the anon key is missing from the environment.',
      nextStep: 'Check .env.local. Contracts return the `unconfigured` snapshot and fall back to mocks.',
    });
  }

  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return NextResponse.json({
      verdict: 'no-clerk-session',
      meaning: 'Clerk did not issue a session token for this request.',
      nextStep: 'Are you signed in? Visit /sign-in first, then reload this route.',
    });
  }

  const { data, error } = await supabase.from('profiles').select('id').maybeSingle();

  if (error) {
    return NextResponse.json({
      verdict: 'token-rejected',
      meaning:
        'Clerk issued a token but Supabase would not accept it, so RLS never ran. ' +
        'This is the third-party auth integration not being enabled on both sides.',
      nextStep:
        'Enable Clerk at dashboard.clerk.com/setup/supabase, then Supabase → ' +
        'Authentication → Third-Party Auth → add Clerk.',
      postgresCode: error.code ?? null,
      detail: error.message,
    });
  }

  if (!data) {
    return NextResponse.json({
      verdict: 'authenticated-but-no-profile',
      meaning:
        'The token validated and RLS ran — this is a WORKING auth chain. RLS simply ' +
        'matched no profile row for your Clerk user id. Not an auth failure.',
      nextStep:
        'A profile row plus a profile_tenant_memberships row is needed. Nothing in the ' +
        'app performs tenant assignment yet, so this is expected on a first run.',
    });
  }

  return NextResponse.json({
    verdict: 'ok',
    meaning: 'Token validated, RLS ran, and a profile row was returned. Chain is live.',
    profileIdPresent: Boolean(data.id),
  });
}
