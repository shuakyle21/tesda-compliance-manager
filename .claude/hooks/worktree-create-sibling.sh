#!/bin/bash
# Overrides EnterWorktree/WorktreeCreate's default nested location
# (<repo>/.claude/worktrees/<name>) with a sibling directory
# (<repo>-worktrees/<name>, next to the repo root) so an editor/terminal
# opened at the parent repo path can't be mistaken for being inside the
# worktree's branch.
#
# Contract: this hook fully replaces `git worktree add` — it must create
# the worktree itself and print the resulting absolute directory path as
# the LAST line of stdout. Everything else goes to stderr.
set -euo pipefail

input="$(cat)"

repo_root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"
repo_name="$(basename "$repo_root")"
worktrees_root="$(cd "$repo_root/.." && pwd)/${repo_name}-worktrees"

name="$(printf '%s' "$input" | jq -r '.name // .worktree_name // .branch // .branch_name // empty' 2>/dev/null || true)"
if [ -z "$name" ]; then
  name="wt-$(date +%s)"
fi
# sanitize to a filesystem- and branch-name-safe token
safe_name="$(printf '%s' "$name" | tr '/' '-' | tr -cd 'A-Za-z0-9._-')"
if [ -z "$safe_name" ]; then
  safe_name="wt-$(date +%s)"
fi

mkdir -p "$worktrees_root"

target_dir="$worktrees_root/$safe_name"
if [ -e "$target_dir" ]; then
  target_dir="${target_dir}-$(date +%s)"
fi

base_branch="${BASE_BRANCH:-main}"
if git -C "$repo_root" rev-parse --verify -q "origin/${base_branch}" >/dev/null 2>&1; then
  base_ref="origin/${base_branch}"
else
  base_ref="$base_branch"
fi

branch_name="$safe_name"
if git -C "$repo_root" rev-parse --verify -q "refs/heads/${branch_name}" >/dev/null 2>&1; then
  git -C "$repo_root" worktree add "$target_dir" "$branch_name" >&2
else
  git -C "$repo_root" worktree add -b "$branch_name" "$target_dir" "$base_ref" >&2
fi

echo "$target_dir"
