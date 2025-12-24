#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
API_ROOT="$PROJECT_ROOT/apps/api"

if [[ -z "${BHP_DATABASE_URL:-}" && -n "${DATABASE_URL:-}" ]]; then
  export BHP_DATABASE_URL="$DATABASE_URL"
fi

cd "$PROJECT_ROOT"
alembic -c "$PROJECT_ROOT/alembic.ini" upgrade head

cd "$API_ROOT"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8001}"
