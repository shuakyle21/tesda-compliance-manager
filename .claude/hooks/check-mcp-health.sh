#!/bin/bash
# SessionStart: surface any MCP server that isn't fully connected (auth
# expired, disconnected, tools-fetch failed) before a task depends on it.
# Silent when everything's healthy.
output=$(claude mcp list 2>&1)
problems=$(echo "$output" | grep -E ' - (!|✗)')

if [ -n "$problems" ]; then
  echo "MCP connectivity check found issues — confirm before relying on these:"
  echo "$problems"
fi

exit 0
