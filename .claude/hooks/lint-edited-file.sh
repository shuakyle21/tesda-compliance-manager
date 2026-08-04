#!/bin/bash
# Lints only the file just edited/written (not the whole repo), so
# pre-existing lint debt elsewhere never blocks an unrelated edit.
file_path=$(jq -r '.tool_input.file_path // empty')

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

cd "${CLAUDE_PROJECT_DIR}" || exit 0

# Prefer eslint_d (persistent daemon — warm runs are ~10x faster than a cold
# eslint start). It caches eslint.config.mjs: after config changes, run
# `node_modules/.bin/eslint_d restart`. Falls back to plain eslint when
# eslint_d isn't installed yet.
if [ -x node_modules/.bin/eslint_d ]; then
  output=$(node_modules/.bin/eslint_d "$file_path" 2>&1)
else
  output=$(npx eslint "$file_path" 2>&1)
fi
status=$?

if [ $status -ne 0 ]; then
  echo "$output" >&2
  exit 2
fi

exit 0
