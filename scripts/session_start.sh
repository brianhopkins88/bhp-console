#!/bin/zsh
set -euo pipefail

echo "Session start: quick context"
echo ""
echo "Docs:"
ls -1 docs
echo ""
if [ -f docs/WORKLOG.md ]; then
  echo "Work log (last 20 lines):"
  tail -n 20 docs/WORKLOG.md
  echo ""
fi

make infra-up

echo ""
echo "Start dev servers in separate terminals:"
echo "  make api"
echo "  make ui"
