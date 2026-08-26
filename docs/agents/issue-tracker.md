# Issue tracker: Linear

Issues live in **Linear**, team **TESDA-CAMS** (key `TES`), which two-way syncs with this GitHub
repo. Use the `linear-server` MCP tools for all operations — not `gh issue create`.

## Conventions

- **Create an issue**: `mcp__linear-server__save_issue` (team TESDA-CAMS). Create on the Linear
  side only — the GitHub sync mirrors it automatically; creating on both sides produces duplicate
  synced pairs.
- **Read an issue**: `mcp__linear-server__get_issue`.
- **List issues**: `mcp__linear-server__list_issues`, filtered by team/state/label as needed.
- **Comment on an issue**: `mcp__linear-server__save_comment`.
- **Apply / remove labels, change status**: `mcp__linear-server__save_issue` with the updated
  `labelIds` / `stateId`.
- **Branch naming**: `klynejoshua13/tes-NN-description`, matching Linear's own slug so the branch
  auto-links to the issue (see the `create-feature-branch` skill).

## Pull requests as a triage surface

**PRs as a request surface: no.** This repo's PRs are collaborator work already tied to a Linear
issue via branch naming, not an external request surface — `/triage` does not need to scan them.

## When a skill says "publish to the issue tracker"

Create a Linear issue in team TESDA-CAMS via `mcp__linear-server__save_issue`.

## When a skill says "fetch the relevant ticket"

Run `mcp__linear-server__get_issue` with the issue ID (e.g. `TES-70`).

## Wayfinding operations

How the `wayfinder` skill's map/ticket/blocking model expresses onto Linear.

- **Map**: a Linear issue in team TESDA-CAMS labelled `wayfinder:map`. Find the active one(s) with
  `mcp__linear-server__list_issues` (`label: "wayfinder:map"`).
- **Ticket**: a child issue of the map — set `parentId` to the map's id on create
  (`mcp__linear-server__save_issue`). Every ticket also carries a `wayfinder:<type>` label
  (`wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, `wayfinder:task`) — create
  these labels once per workspace with `mcp__linear-server__create_issue_label` if they don't
  exist yet (`list_issue_labels` to check first).
- **Claim**: `mcp__linear-server__save_issue` with `assignee: "me"` (the dev driving the map, i.e.
  the identity behind the Linear API key) — before any work on the ticket.
- **Blocking**: Linear's native issue relations. Set with `save_issue`'s `blockedBy` /
  `blocks` params (append-only; use `removeBlockedBy`/`removeBlocks` to clear). Read them with
  `mcp__linear-server__get_issue` (`includeRelations: true`).
- **Frontier query** (open, unblocked, unclaimed children of a map): `list_issues` with
  `parentId: "<map-id>"`, `assignee: null`, filtered to non-`completed`/non-`canceled` states —
  then cross-check each result's blocking relations via `get_issue includeRelations: true`, since
  `list_issues` doesn't filter on relations directly.
- **Resolve**: post the answer as a comment (`save_comment`, `issueId`), close the ticket
  (`save_issue`, `state: "Done"`), then append one line to the map's own description under
  "## Decisions so far" using `save_issue`'s `patch` param (`op: "replace"`, matching the
  `## Decisions so far` heading through the following heading) — never rewrite the whole
  description for a one-line addition.
- A `research`-type ticket that would require querying the **live Supabase project** (not just
  local repo files/docs) needs the user's explicit go-ahead first — never run
  `execute_sql`/`apply_migration` without an explicit yes, per this repo's standing Supabase
  permission rule. Note that requirement in the ticket body and don't auto-fire its research
  subagent during charting; surface it to the user instead.
