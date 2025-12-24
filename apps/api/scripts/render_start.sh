#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BHP_DATABASE_URL:-}" && -n "${DATABASE_URL:-}" ]]; then
  export BHP_DATABASE_URL="$DATABASE_URL"
fi

alembic upgrade head
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8001}"
