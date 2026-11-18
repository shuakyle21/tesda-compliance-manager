# Files

- [Module Boundaries and the Data Layer Pattern](module-boundaries-and-data-pattern.md) - How code is grouped into app/, modules/<domain>/{data,domain,ui}, shared/ and lib/supabase/, which import edges lint forbids and why a zone failure is an architecture violation, and the fetch -> map -> derive contract with its discriminated snapshot union, guard ordering and total-enum bridge.
- [Verification and Test Strategy](verification-and-test-strategy.md) - How to prove a change here — the pnpm lint → pnpm exec tsc --noEmit → pnpm test chain on Node 22+, what the 32 unit specs actually pin and the stale-test trap, why e2e/auth.spec.ts exists, and the real-Supabase RLS suite that still does not.
