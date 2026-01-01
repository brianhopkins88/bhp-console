#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8001/api/v1}"

echo "Using API_BASE=$API_BASE"

run_id=$(
  curl -s -X POST "$API_BASE/agent-runs" \
    -H "Content-Type: application/json" \
    -d '{"goal":"canonical tool smoke","plan":[],"run_metadata":{"source":"smoke"}}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])"
)
echo "Created run: $run_id"

echo "Executing canonical.page_config.create (safe_auto_commit)..."
safe_response=$(
  curl -s -X POST "$API_BASE/tools/execute" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$run_id\",\"tool_name\":\"canonical.page_config.create\",\"input\":{\"page_id\":\"home\",\"config_data\":{\"title\":\"Home\"},\"commit_classification\":\"safe_auto_commit\",\"status\":\"draft\"}}"
)
echo "$safe_response" | python3 -m json.tool

status=$(echo "$safe_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
if [ "$status" != "completed" ]; then
  echo "Expected completed status, got $status" >&2
  exit 1
fi

echo "Executing canonical.page_config.create (approval_required)..."
approval_response=$(
  curl -s -X POST "$API_BASE/tools/execute" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$run_id\",\"tool_name\":\"canonical.page_config.create\",\"input\":{\"page_id\":\"home\",\"config_data\":{\"title\":\"Home V2\"},\"commit_classification\":\"approval_required\",\"status\":\"draft\"}}"
)
echo "$approval_response" | python3 -m json.tool

status=$(echo "$approval_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
if [ "$status" != "requires_approval" ]; then
  echo "Expected requires_approval status, got $status" >&2
  exit 1
fi

approval_id=$(echo "$approval_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['approval_id'])")
echo "Approving canonical change..."
curl -s -X POST "$API_BASE/approvals/$approval_id/decision" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","decided_by":"smoke"}' \
  | python3 -m json.tool

echo "Executing canonical.page_config.create with approval..."
approved_response=$(
  curl -s -X POST "$API_BASE/tools/execute" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$run_id\",\"tool_name\":\"canonical.page_config.create\",\"input\":{\"page_id\":\"home\",\"config_data\":{\"title\":\"Home V2\"},\"commit_classification\":\"approval_required\",\"status\":\"draft\"},\"approval_id\":$approval_id}"
)
echo "$approved_response" | python3 -m json.tool

status=$(echo "$approved_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
if [ "$status" != "completed" ]; then
  echo "Expected completed status, got $status" >&2
  exit 1
fi

echo "Smoke test complete."
