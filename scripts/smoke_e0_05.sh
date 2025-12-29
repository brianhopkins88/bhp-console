#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8001/api/v1}"

echo "Using API_BASE=$API_BASE"

run_id=$(
  curl -s -X POST "$API_BASE/agent-runs" \
    -H "Content-Type: application/json" \
    -d '{"goal":"tool smoke","plan":[],"run_metadata":{"source":"smoke"}}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])"
)
echo "Created run: $run_id"

echo "Executing system.echo..."
echo_response=$(
  curl -s -X POST "$API_BASE/tools/execute" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$run_id\",\"tool_name\":\"system.echo\",\"input\":{\"message\":\"hello\"}}"
)
echo "$echo_response" | python3 -m json.tool

echo "Executing website.run_checks..."
checks_response=$(
  curl -s -X POST "$API_BASE/tools/execute" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$run_id\",\"tool_name\":\"website.run_checks\",\"input\":{\"version\":\"v1\",\"environment\":\"staging\",\"status\":\"passed\"}}"
)
echo "$checks_response" | python3 -m json.tool

echo "Executing website.deploy (should require approval)..."
deploy_response=$(
  curl -s -X POST "$API_BASE/tools/execute" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$run_id\",\"tool_name\":\"website.deploy\",\"input\":{\"target\":\"staging\",\"version\":\"v1\"}}"
)
echo "$deploy_response" | python3 -m json.tool

status=$(echo "$deploy_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])")
if [ "$status" != "requires_approval" ]; then
  echo "Expected requires_approval status, got $status" >&2
  exit 1
fi

approval_id=$(echo "$deploy_response" | python3 -c "import sys, json; print(json.load(sys.stdin)['approval_id'])")
echo "Approving deploy..."
curl -s -X POST "$API_BASE/approvals/$approval_id/decision" \
  -H "Content-Type: application/json" \
  -d '{"status":"approved","decided_by":"smoke"}' \
  | python3 -m json.tool

echo "Executing website.deploy with approval..."
approved_deploy=$(
  curl -s -X POST "$API_BASE/tools/execute" \
    -H "Content-Type: application/json" \
    -d "{\"run_id\":\"$run_id\",\"tool_name\":\"website.deploy\",\"input\":{\"target\":\"staging\",\"version\":\"v1\"},\"approval_id\":$approval_id}"
)
echo "$approved_deploy" | python3 -m json.tool

echo "Smoke test complete."
