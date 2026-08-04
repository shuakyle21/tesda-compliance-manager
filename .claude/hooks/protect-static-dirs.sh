#!/bin/bash
# Blocks Edit/Write under directories CLAUDE.md marks as static/handoff
# artifacts ported verbatim from the design bundle (see eslint.config.mjs
# globalIgnores): assets/, preview/, screenshots/, ui_kits/, uploads/.
file_path=$(jq -r '.tool_input.file_path // empty')

if [ -z "$file_path" ]; then
  exit 0
fi

if echo "$file_path" | grep -qE '(^|/)(assets|preview|screenshots|ui_kits|uploads)/'; then
  echo "Blocked: '$file_path' is under a static/handoff directory (assets/, preview/, screenshots/, ui_kits/, uploads/) that CLAUDE.md says is ported verbatim and excluded from lint/build. Edit the source design file instead, or confirm with the user before restructuring." >&2
  exit 2
fi

exit 0
