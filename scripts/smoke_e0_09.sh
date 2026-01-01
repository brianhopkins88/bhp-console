#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8001/api/v1}"

echo "Using API_BASE=$API_BASE"

CURL_AUTH_ARGS=()
COOKIE_JAR=""

if [[ -n "${SMOKE_USER_ID:-}" && -n "${SMOKE_PASSWORD:-}" ]]; then
  COOKIE_JAR="$(mktemp)"
  login_response=$(
    curl -s -X POST "$API_BASE/auth/login" \
      -H "Content-Type: application/json" \
      -c "$COOKIE_JAR" \
      -d "{\"user_id\":\"$SMOKE_USER_ID\",\"password\":\"$SMOKE_PASSWORD\"}"
  )
  if ! echo "$login_response" | python3 -c "import sys, json; json.load(sys.stdin);"; then
    echo "Auth login failed: $login_response" >&2
    exit 1
  fi
  CURL_AUTH_ARGS=(-b "$COOKIE_JAR")
elif [[ -n "${SMOKE_BASIC_USER:-}" && -n "${SMOKE_BASIC_PASS:-}" ]]; then
  CURL_AUTH_ARGS=(-u "${SMOKE_BASIC_USER}:${SMOKE_BASIC_PASS}")
fi

run_id=$(
  curl -s -X POST "$API_BASE/agent-runs" \
    -H "Content-Type: application/json" \
    "${CURL_AUTH_ARGS[@]}" \
    -d '{"goal":"canonical read tool smoke","plan":[],"run_metadata":{"source":"smoke"}}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin).get('id'))"
)
if [[ -z "$run_id" || "$run_id" == "None" ]]; then
  echo "Failed to create run. Check auth or API response." >&2
  exit 1
fi
echo "Created run: $run_id"

call_tool () {
  local tool_name=$1
  local tool_input=$2
  echo "Executing $tool_name..."
  response=$(
    curl -s -X POST "$API_BASE/tools/execute" \
      -H "Content-Type: application/json" \
      "${CURL_AUTH_ARGS[@]}" \
      -d "{\"run_id\":\"$run_id\",\"tool_name\":\"$tool_name\",\"input\":$tool_input}"
  )
  echo "$response" | python3 -m json.tool
  status=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
  if [ "$status" != "completed" ]; then
    echo "Expected completed status, got $status" >&2
    exit 1
  fi
}

call_tool "canonical.business_profile.latest" "{}"
call_tool "canonical.business_profile.history" "{\"limit\":5}"
call_tool "canonical.site_structure.latest" "{}"
call_tool "canonical.site_structure.history" "{\"limit\":5}"

echo "Smoke test complete."
