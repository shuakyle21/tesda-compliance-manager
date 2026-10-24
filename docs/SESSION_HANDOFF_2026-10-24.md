# Session handoff — 2026-10-24

Picking up uncommitted work on `docs/openwiki-full-refresh`. This records what the
working tree held, what was kept, what was discarded, and what is genuinely left.

**Verification note.** Everything below about *git state, typecheck and tests* was
re-run in this session and is first-hand. Everything about *live Supabase schema state*
is **inherited, not re-verified** — the Supabase MCP server is unauthenticated in this
session, and RULES rule 36 requires an explicit yes before touching the live project.

---

## 1. The branch is already merged — there was no in-flight work

This is the headline, and it reframes everything else.

| Fact | Evidence |
| --- | --- |
| PR **#268 `docs/openwiki-full-refresh` merged** 2026-10-04T07:26Z | `gh pr list --head docs/openwiki-full-refresh --state all` |
| `7a0fdf6` (OpenWiki full refresh) is in `origin/main` | `git merge-base --is-ancestor` → YES |
| `942e827` (auth redirect_url sanitize) is in `origin/main` | `git merge-base --is-ancestor` → YES |
| `git log origin/main..HEAD` is **one commit**, the local merge `56ac196` | only `56ac196` listed |

`56ac196` is a *local re-merge* of `origin/main` into the branch. The remote branch
already carries `e3ffda7`, a different merge commit doing the same logical merge, and
`e3ffda7` is what went into the merged PR. So local and remote have diverged by
**one redundant merge commit each**, and `56ac196` contributes nothing to `main`.

**Conclusion:** no commit-level work was half-finished. What remained was loose
working-tree edits sitting on a dead branch. They do not belong on this branch.

## 2. What the working tree held

Seven modified files plus two untracked. Three were real; four were accidental.

### Kept — real work

| File | Change | Verdict |
| --- | --- | --- |
| `supabase/migrations/README.md` | Rewrites the state table: 7 migrations, all recorded + present, as of 2026-10-04 | **Keep.** Genuine knowledge capture; completes issue #230. |
| `modules/activity/data/activity.ts` | `as X` → `as unknown as X` | **Keep.** Load-bearing, proven below — and it was **1 of 4**; the other 3 are now finished (§3). |
| `.github/workflows/openwiki-update.yml` | `OPENWIKI_MODEL_ID: "auto"` → `"flash"` | **Keep, but unverified.** See §5. |

### Reverted — accidental cruft

| File | What it was | Why reverted |
| --- | --- | --- |
| `package.json` + `pnpm-lock.yaml` | Adds `react-router@^8.4.0` | Three strikes: this is a **Next.js App Router** app that does not use react-router; the package is imported **nowhere** (`grep` across `app/ modules/ shared/ lib/ tests/` → 0 hits); and its peer range demands `react >=19.2.7` while the project pins `19.2.4`. |
| `supabase/migrations/20260528160300_…sql` | Re-indents the `profile_role` enum, dangling `);` | Formatter churn inside the **canonical, already-applied** migration. RULES §3: migrations are additive. |
| `supabase/migrations/20260910120000_…sql` | `"trustworthy until this is done"` → `"trustworthy unti considerationl this is done"` | Corrupted word from a stray autocomplete/paste, inside an applied migration. |

Likely origin of the cruft: an `opencode` or Qodana session, given the untracked
`opencode.json` and the recent `chore/qodana-config` work.

The full pre-revert diff is preserved at
`/private/tmp/claude-501/-Users-gabz-1-Downloads-tesda-compliance-manager-design-system-v0/c4164910-71b5-401d-8db5-cef93b57db39/scratchpad/backup/uncommitted.patch`
(session-scoped; copy it out if you want it to survive).

## 3. The cast sweep — this *was* the unfinished work, and it is now finished

`lib/supabase/database.types.ts` is hand-maintained and stubs every table's
`Relationships` as `[]`. Its own header comment already names the consequence:

> That stub is what makes supabase-js unable to infer embedded joins, which is the root
> of the four long-standing TS2352 casts in `activity.ts`, `batches.ts`, `tenancy.ts`
> and `users.ts`.

Measured both ways with `tsc --noEmit`:

- **with** `as unknown as` → 8 errors, none in `activity.ts`
- **without** it → 9 errors, the extra one being `activity.ts(127,72): error TS2352`

TypeScript's own message prescribes the fix: *"If this was intentional, convert the
expression to 'unknown' first."* So the edit is correct.

**It is also safe at runtime,** which matters more than the compile fix. The declared
shape is `profiles: Pick<ProfileRow,'full_name'|'role'> | null` — a single object, not
an array. The FK backs that up:

```sql
profile_id uuid references public.profiles(id) on delete set null
```

Many-to-one, so PostgREST embeds `profiles` as one object. Had it been one-to-many,
`row.profiles?.full_name` would silently be `undefined` and **every** activity event
would render its actor as `"System"` — a double cast would have hidden that. It does
not apply here.

### The other three were failing too — so the edit was a sweep stopped one-quarter in

The uncommitted edit fixed **one of the four casts the header names**. Measuring the
remaining 8 errors by code, rather than by file, showed the other three were failing with
the *identical* TS2352:

```
modules/batches/data/batches.ts(309,59)  :: TS2352   <- as BatchRowWithProgram
modules/tenancy/data/tenancy.ts(145,51)  :: TS2352   <- as ProfileRowWithTenants
modules/tenancy/data/users.ts(161,17)    :: TS2352   <- as ProfileLookupRow
```

So this was not an isolated tweak — it was a sweep abandoned after the first file.
**Completed here.** Each was checked for FK/shape agreement first, exactly as `activity.ts`
was, because a double cast silences a genuine array-vs-object mismatch just as readily as
a spurious one:

| Declared shape | Expect | FK in the migration | OK |
| --- | --- | --- | --- |
| `scholarship_programs: {…} \| null` | object | `batches.program_id → scholarship_programs(id)` | ✓ |
| `program_document_requirements: Row[] \| null` | array | `…requirements.program_id → scholarship_programs(id)` | ✓ |
| `documents: DocumentRow[] \| null` | array | `documents.batch_id → batches(id)` | ✓ |
| `profile_tenant_memberships: (…)[] \| null` | array | `…memberships.profile_id → profiles(id)` | ✓ |
| nested `tenants: TenantRow \| null` | object | `…memberships.tenant_id → tenants(id)` | ✓ |
| `ProfileLookupRow.profile_tenant_memberships: {tenant_id}[] \| null` | array | same as above | ✓ |

All six agree, so no cast hides a real defect. `RULES.md` has no rule governing type
assertions in `data/`, so the pattern breaks nothing.

**Result: `tsc` errors 9 → 5** against `origin/main`, and all 5 remaining are the one
unrelated bug in §4a. (The "8" quoted elsewhere was measured on local HEAD, which already
carried the uncommitted `activity.ts` fix. `origin/main` itself reports **9**, all four
casts failing — verified by checking the four files out from `origin/main` and re-running.)
Tests unchanged: 267 passing, the same 2 pre-existing sidebar failures. The TS2352 family
the types header complains about is now fully retired.

## 4. Pre-existing breakage found — NOT caused by these edits

Both of these reproduce on a clean tree and on `origin/main`. They were verified
pre-existing by stashing the three kept files and re-running.

**Scope of the `main` claim.** `HEAD..origin/main` is **not** empty — `origin/main` has
moved on to PR #276, including `8aae61a refactor(tenancy)`. So the counts below were
measured on local HEAD, not on `main`. They transfer because every file involved is
byte-identical between local HEAD and `origin/main` (`git diff HEAD origin/main -- <file>`
→ no change for `database.types.ts`, `batches.ts`, `tenancy.ts`, `documents.ts`,
`activity.ts`, `Sidebar.tsx`, `sidebar.test.ts`). Only `users.ts` differs, and
`origin/main`'s copy carries the same cast at the same line with the same declared shape,
so its TS2352 was present there too.

### 4a. `LifecycleStage` casing drift — 5 of the 8 typecheck errors

`lib/supabase/database.types.ts:34` declares the enum with two members uppercased:

```ts
export type LifecycleStage =
  | 'AOU' //Affidavit of Undertaking
  | 'NTP' //Notice to Proceed
  | 'tip' | 'training' | 'assessment' | 'billing' | 'completed' | 'blocked';
```

The canonical migration disagrees, and it is the authority:

```sql
create type public.lifecycle_stage as enum
  ('aou','ntp','tip','training','assessment','billing','completed','blocked');
```

`CLAUDE.md` also documents the DB enum as lowercase. The uppercasing looks like it
happened while the explanatory `//` comments were added. It is confirmed present in
`origin/main`, so **`main`'s typecheck is currently broken.**

Fallout — these **5**, which are the whole of what `tsc` still reports:

```
modules/batches/data/batches.ts(104,3)   :: TS2561   "'aou' does not exist … mean 'AOU'?"
modules/documents/data/documents.ts(50,3):: TS2561
tests/unit/batches.test.ts(86,15)        :: TS2820
tests/unit/batches.test.ts(99,15)        :: TS2820
tests/unit/documents.test.ts(15,5)       :: TS2820
```

The fix is two string literals, `'AOU'→'aou'` and `'NTP'→'ntp'`. **Deliberately not done
here** — nobody had started it, it is unrelated to this branch, and it sits on the
generated-types boundary where `RULES.md` §20 wants types regenerated rather than
hand-patched. It wants its own branch and review.

### 4b. Two failing tests in `tests/unit/sidebar.test.ts`

```
Test Files  1 failed | 21 passed (22)
     Tests  2 failed | 267 passed (269)
```

One asserts `sb-user-name` reads `"Name not set"`; it receives `""`. Identical
failures with the three kept files stashed, so pre-existing and untouched by this work.

Baseline drift worth noting: memory recorded 21 files / 249 tests on 2026-09-11; it is
now 22 / 269.

## 5. Open decisions — these are yours, not mine

1. ~~**Where the kept work lands.**~~ **Done 2026-10-24.** Committed to
   `klynejoshua13/recover-stranded-openwiki-work`, cut from `origin/main`, as three
   commits:
   - `c105e79 docs(supabase): record verified migration state as of 2026-10-04`
   - `e4ac51b fix(data): widen the four Supabase join casts through unknown`
   - `0d45574 ci(openwiki): pin the model id to flash`
   Verified on that branch: `tsc` 5 errors (down from 9 on `origin/main`), tests
   267/269 with the 2 pre-existing sidebar failures, lint 0 errors / 1 pre-existing
   warning. **Not pushed, no PR.** Note git initially set the branch to track
   `origin/main`; that upstream was cleared, so a push needs an explicit `-u`.
   Nothing has been committed or pushed — per your standing rule, that is your call.
2. **`OPENWIKI_MODEL_ID: "flash"`.** Introduced as `"auto"` in `e92875d` and never
   changed since, so `"flash"` is new, not a revert. Plausibly a timeout lever. I
   cannot verify the provider accepts the literal `flash`; **confirm before relying
   on a nightly run.**
3. **`openwiki/.langsmith.json` (untracked).** This one is counter-intuitive, so note
   the reasoning. It is **meant to be committed** — `apiKeyEnv` holds the *name* of an
   env var, not a key, and the workflow already exports `OPENWIKI_LANGSMITH_API_KEY`.
   Per memory `openwiki-langsmith-state`, the connector is inert *precisely because
   this file does not exist*. **But** that same memory judges the connector useless
   here: TVI-CAMS has no LLM/agent code, so there are no traces to pull. It also names a
   LangSmith project `openwiki`, which matches the `LANGCHAIN_PROJECT=openwiki` used for
   OpenWiki's *own* agent tracing — so committing it plausibly feeds the docs agent's
   self-traces into the wiki. **That last point is an inference from the project name, not
   something verified.** Left untracked deliberately. **Decide, don't drift.**
4. **`opencode.json` (untracked).** Personal `opencode` MCP config, and it carries the
   Supabase `project_ref`. Belongs in `.gitignore`, not in a commit. Left untracked.
5. **The dead branch.** Once the three files move, `docs/openwiki-full-refresh` and its
   redundant local merge `56ac196` can be discarded. Do not push `56ac196`.

## 6. Environment notes

- `node_modules` was **empty** at session start; restored with
  `pnpm install --frozen-lockfile` (clean, exit 0, ~1.1 GB).
- Disk sat at **92% / 17 GB free** before the install — the chronic pressure on this
  machine. Worth a check before the next big install.
- Node is v22.22.0, which satisfies the Node-22 requirement Vitest 4 / rolldown needs.

---

## Verification summary

| Claim | How verified here |
| --- | --- |
| PR #268 merged; both commits in `origin/main` | `gh pr list`, `git merge-base` — first-hand |
| `react-router` unused | `grep` across all source dirs — first-hand |
| `activity.ts` cast load-bearing | `tsc --noEmit` both ways, 9 vs 8 — first-hand |
| All 4 casts safe at runtime | 6 declared shapes vs FK direction in the migrations — first-hand |
| Cast sweep took `tsc` 9 → 5 on `origin/main` | checked the 4 files out from `origin/main`, re-ran, then restored — first-hand |
| `LifecycleStage` drift, on `main` too | `git show origin/main:…` vs migration — first-hand |
| 8 typecheck errors / 2 test failures pre-existing | stash + re-run — first-hand |
| Those counts apply to `origin/main` | every file byte-identical except `users.ts`, whose cast site is the same — first-hand |
| **Live DB migration state in the README table** | **inherited from the prior session; NOT re-verified** (Supabase MCP unauthenticated, rule 36) |
