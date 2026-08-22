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
